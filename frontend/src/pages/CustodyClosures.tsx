import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
import { formatNumber, formatDate as formatDateUtil } from '@/lib/format'
import { getLocalizedName } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Trash2, Printer, Download, Eye, Edit, X, Search, File } from 'lucide-react'

interface CustodyClosureInvoice {
  id?: number
  invoiceDate: string
  invoiceNumber: string
  amountWithoutTax: number
  discount: number
  amountAfterDiscount: number
  taxRate: number // VAT percentage (15, 5, or 0)
  tax: number
  total: number
  description: string
}

interface CustodyClosureAttachment {
  id: number
  fileName: string
  filePath: string
  fileSize: number
  mimeType?: string
  uploadedByName?: string
  uploadedAt: string
}

interface CustodyClosure {
  id?: number
  closureNumber?: string
  closureDate: string
  custodyManagerId: number
  custodyManagerName?: string
  closedById: number
  closedByName?: string
  branchId?: number
  branchName?: string
  branchNameAr?: string
  branchNameEn?: string
  totalExclTax: number
  totalDiscount: number
  totalTax: number
  grandTotal: number
  notes: string
  invoices: CustodyClosureInvoice[]
  attachments: CustodyClosureAttachment[]
}

export default function CustodyClosures() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isArabic = i18n.language === 'ar'
  const [closures, setClosures] = useState<CustodyClosure[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewingClosure, setViewingClosure] = useState<CustodyClosure | null>(null)
  const [editingClosure, setEditingClosure] = useState<CustodyClosure | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; fileName: string; mimeType?: string } | null>(null)
  const [formData, setFormData] = useState<CustodyClosure>({
    closureDate: new Date().toISOString().split('T')[0],
    custodyManagerId: 0,
    closedById: user?.id || 0,
    totalExclTax: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0,
    notes: '',
    invoices: [],
    attachments: [],
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Helper function to create an empty invoice
  const createEmptyInvoice = (): CustodyClosureInvoice => ({
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    amountWithoutTax: 0,
    discount: 0,
    amountAfterDiscount: 0,
    taxRate: 0,
    tax: 0,
    total: 0,
    description: '',
  })

  useEffect(() => {
    loadCustodyClosures()
    loadUsers()
    loadBranches()
  }, [])

  const loadCustodyClosures = async () => {
    try {
      setLoading(true)
      const res = await api.get('/custody-closures')
      const closuresData = Array.isArray(res.data) ? res.data : []
      console.log('Loaded custody closures:', closuresData)
      // Debug: Log branch information for each closure
      closuresData.forEach((closure: CustodyClosure, index: number) => {
        console.log(`Closure ${index + 1} (ID: ${closure.id}):`, {
          branchId: closure.branchId,
          branchNameAr: closure.branchNameAr,
          branchNameEn: closure.branchNameEn,
          branchName: closure.branchName,
        })
      })
      setClosures(closuresData)
    } catch (error: any) {
      console.error('Failed to load custody closures:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
      setClosures([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    }
  }

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches')
      setBranches(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to load branches:', error)
      setBranches([])
    }
  }

  // Calculate financial summary from invoices
  const calculateFinancialSummary = (invoices: CustodyClosureInvoice[]) => {
    let totalExclTax = 0
    let totalDiscount = 0
    let totalTax = 0
    let grandTotal = 0

    invoices.forEach(invoice => {
      const amountWithoutTax = parseFloat(String(invoice.amountWithoutTax || 0))
      const discount = parseFloat(String(invoice.discount || 0))
      const amountAfterDiscount = amountWithoutTax - discount
      const tax = parseFloat(String(invoice.tax || 0))
      const total = amountAfterDiscount + tax

      totalExclTax += amountWithoutTax
      totalDiscount += discount
      totalTax += tax
      grandTotal += total
    })

    return { totalExclTax, totalDiscount, totalTax, grandTotal }
  }

  // Update invoice calculations
  const updateInvoiceCalculations = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newInvoices = [...prev.invoices]
      const invoice = { ...newInvoices[index] }

      if (field === 'amountWithoutTax' || field === 'discount') {
        invoice[field] = parseFloat(String(value)) || 0
        const amountWithoutTax = parseFloat(String(invoice.amountWithoutTax || 0))
        const discount = parseFloat(String(invoice.discount || 0))
        invoice.amountAfterDiscount = amountWithoutTax - discount
        // Calculate tax based on tax rate
        const taxRate = parseFloat(String(invoice.taxRate || 0))
        invoice.tax = (invoice.amountAfterDiscount * taxRate) / 100
        invoice.total = invoice.amountAfterDiscount + invoice.tax
      } else if (field === 'taxRate') {
        invoice.taxRate = parseFloat(String(value)) || 0
        // Recalculate tax and total based on new tax rate
        const taxRate = invoice.taxRate
        invoice.tax = (invoice.amountAfterDiscount * taxRate) / 100
        invoice.total = invoice.amountAfterDiscount + invoice.tax
      } else {
        (invoice as any)[field] = value
      }

      newInvoices[index] = invoice

      // Recalculate financial summary
      const summary = calculateFinancialSummary(newInvoices)

      return {
        ...prev,
        invoices: newInvoices,
        ...summary,
      }
    })
  }

  const handleAddInvoice = () => {
    setFormData(prev => ({
      ...prev,
      invoices: [...prev.invoices, createEmptyInvoice()],
    }))
  }

  const handleRemoveInvoice = (index: number) => {
    setFormData(prev => {
      const newInvoices = prev.invoices.filter((_, i) => i !== index)
      const summary = calculateFinancialSummary(newInvoices)
      return {
        ...prev,
        invoices: newInvoices,
        ...summary,
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.closureDate || !formData.custodyManagerId || !formData.closedById) {
      toast({
        title: t('common.error'),
        description: t('custodyClosures.requiredFields'),
        variant: 'destructive',
      })
      return
    }

    if (formData.invoices.length === 0) {
      toast({
        title: t('common.error'),
        description: t('custodyClosures.atLeastOneInvoice'),
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const formDataToSend = new FormData()
      formDataToSend.append('closureDate', formData.closureDate)
      formDataToSend.append('custodyManagerId', String(formData.custodyManagerId))
      formDataToSend.append('closedById', String(formData.closedById))
      // Always send branchId - send the actual value or empty string if 0/null/undefined
      // This allows the backend to clear the branch if needed
      const branchIdToSend = (formData.branchId && formData.branchId > 0) ? String(formData.branchId) : ''
      formDataToSend.append('branchId', branchIdToSend)
      formDataToSend.append('notes', formData.notes || '')
      formDataToSend.append('invoices', JSON.stringify(formData.invoices))
      
      // Debug log - log all FormData entries
      console.log('Submitting custody closure:', {
        branchId: formData.branchId,
        branchIdToSend: branchIdToSend,
        closureDate: formData.closureDate,
        custodyManagerId: formData.custodyManagerId,
        closedById: formData.closedById,
        isEdit: !!editingClosure?.id,
        editingId: editingClosure?.id,
      })
      
      // Log all FormData entries (for debugging)
      console.log('FormData entries:')
      for (const [key, value] of formDataToSend.entries()) {
        if (key === 'attachments') {
          console.log(`  ${key}: [File]`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }

      // Add files
      selectedFiles.forEach(file => {
        formDataToSend.append('attachments', file)
      })

      if (editingClosure?.id) {
        await api.put(`/custody-closures/${editingClosure.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        toast({
          title: t('common.success'),
          description: t('custodyClosures.updatedSuccess'),
        })
      } else {
        await api.post('/custody-closures', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        toast({
          title: t('common.success'),
          description: t('custodyClosures.createdSuccess'),
        })
      }

      handleCancel()
      loadCustodyClosures()
    } catch (error: any) {
      console.error('Failed to save custody closure:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingClosure(null)
    setViewingClosure(null)
    setSelectedFiles([])
    setFormData({
      closureDate: new Date().toISOString().split('T')[0],
      custodyManagerId: 0,
      closedById: user?.id || 0,
      branchId: 0,
      totalExclTax: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0,
      notes: '',
      invoices: [],
      attachments: [],
    })
  }

  const handleEdit = async (closure: CustodyClosure) => {
    try {
      setLoading(true)
      // Fetch full closure data from API to ensure we have all details
      const res = await api.get(`/custody-closures/${closure.id}`)
      const fullClosure = res.data
      
      console.log('Full closure data from API:', fullClosure)
      console.log('Closure date:', fullClosure.closureDate)
      console.log('Branch ID:', fullClosure.branchId)
      console.log('Branch Name Ar:', fullClosure.branchNameAr)
      console.log('Branch Name En:', fullClosure.branchNameEn)
      
      // Format closureDate to YYYY-MM-DD if it's not already in that format
      let formattedDate = fullClosure.closureDate
      if (formattedDate && formattedDate.includes('T')) {
        formattedDate = formattedDate.split('T')[0]
      } else if (formattedDate && formattedDate.includes(' ')) {
        formattedDate = formattedDate.split(' ')[0]
      }
      
      // Calculate taxRate from tax and amountAfterDiscount for each invoice
      const invoicesWithTaxRate = (fullClosure.invoices || []).map((invoice: any) => {
        const amountAfterDiscount = parseFloat(String(invoice.amountAfterDiscount || 0))
        const tax = parseFloat(String(invoice.tax || 0))
        let taxRate = 0
        if (amountAfterDiscount > 0) {
          taxRate = (tax / amountAfterDiscount) * 100
          // Round to nearest 0, 5, or 15
          if (taxRate >= 14.5 && taxRate <= 15.5) taxRate = 15
          else if (taxRate >= 4.5 && taxRate <= 5.5) taxRate = 5
          else if (taxRate < 0.5) taxRate = 0
        }
        return {
          ...invoice,
          taxRate: taxRate,
        }
      })
      
      setEditingClosure(fullClosure)
      
      // Ensure branchId is set correctly - keep the actual value or 0 if null/undefined
      // Note: 0 means "no branch selected" in the form
      const branchId = (fullClosure.branchId !== null && fullClosure.branchId !== undefined && fullClosure.branchId > 0) 
        ? fullClosure.branchId 
        : 0
      
      // Verify branch exists in branches list
      if (branchId > 0) {
        const branchExists = branches.find(b => b.id === branchId)
        console.log('Branch lookup:', {
          branchId,
          branchExists: !!branchExists,
          branchName: branchExists ? getLocalizedName(branchExists) : 'NOT FOUND',
          availableBranches: branches.map(b => ({ id: b.id, name: getLocalizedName(b) }))
        })
      }
      
      const formDataToSet = {
        ...fullClosure,
        closureDate: formattedDate || fullClosure.closureDate,
        branchId: branchId,
        branchNameAr: fullClosure.branchNameAr || undefined,
        branchNameEn: fullClosure.branchNameEn || undefined,
        invoices: invoicesWithTaxRate,
        attachments: fullClosure.attachments || [],
      }
      
      console.log('Setting form data:', {
        closureDate: formDataToSet.closureDate,
        branchId: formDataToSet.branchId,
        branchNameAr: formDataToSet.branchNameAr,
        branchNameEn: formDataToSet.branchNameEn,
        custodyManagerId: formDataToSet.custodyManagerId,
        closedById: formDataToSet.closedById,
      })
      
      setFormData(formDataToSet)
      
      setShowForm(true)
    } catch (error: any) {
      console.error('Failed to load closure for editing:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (id: number) => {
    try {
      const res = await api.get(`/custody-closures/${id}`)
      // Calculate taxRate from tax and amountAfterDiscount for each invoice
      const invoicesWithTaxRate = (res.data.invoices || []).map((invoice: any) => {
        const amountAfterDiscount = parseFloat(String(invoice.amountAfterDiscount || 0))
        const tax = parseFloat(String(invoice.tax || 0))
        let taxRate = 0
        if (amountAfterDiscount > 0) {
          taxRate = (tax / amountAfterDiscount) * 100
          // Round to nearest 0, 5, or 15
          if (taxRate >= 14.5 && taxRate <= 15.5) taxRate = 15
          else if (taxRate >= 4.5 && taxRate <= 5.5) taxRate = 5
          else if (taxRate < 0.5) taxRate = 0
        }
        return {
          ...invoice,
          taxRate: taxRate,
        }
      })
      setViewingClosure({
        ...res.data,
        invoices: invoicesWithTaxRate,
      })
    } catch (error: any) {
      console.error('Failed to load custody closure:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('custodyClosures.confirmDelete'))) {
      return
    }

    try {
      await api.delete(`/custody-closures/${id}`)
      toast({
        title: t('common.success'),
        description: t('custodyClosures.deletedSuccess'),
      })
      loadCustodyClosures()
    } catch (error: any) {
      console.error('Failed to delete custody closure:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    }
  }

  const handleDownloadAttachment = async (closureId: number, attachmentId: number, fileName: string) => {
    try {
      const res = await api.get(`/custody-closures/${closureId}/attachments/${attachmentId}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Failed to download attachment:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    }
  }

  const handlePreviewAttachment = async (closureId: number, attachmentId: number, fileName: string, mimeType?: string) => {
    try {
      console.log('Previewing attachment:', { closureId, attachmentId, fileName, mimeType })
      
      // Determine mimeType from file extension if not provided
      let detectedMimeType = mimeType
      if (!detectedMimeType) {
        const ext = fileName.toLowerCase().split('.').pop()
        if (ext === 'pdf') detectedMimeType = 'application/pdf'
        else if (ext === 'jpg' || ext === 'jpeg') detectedMimeType = 'image/jpeg'
        else if (ext === 'png') detectedMimeType = 'image/png'
        else if (ext === 'gif') detectedMimeType = 'image/gif'
        else if (ext === 'webp') detectedMimeType = 'image/webp'
        else if (['txt', 'csv'].includes(ext || '')) detectedMimeType = 'text/plain'
      }
      
      const res = await api.get(`/custody-closures/${closureId}/attachments/${attachmentId}`, {
        responseType: 'blob',
      })
      console.log('Attachment response received:', res)
      
      // Check response content-type header
      const contentType = res.headers['content-type'] || detectedMimeType || 'application/octet-stream'
      const finalMimeType = detectedMimeType || contentType
      
      const blob = new Blob([res.data], { type: finalMimeType })
      const url = window.URL.createObjectURL(blob)
      console.log('Blob URL created:', url, 'MimeType:', finalMimeType, 'Blob size:', blob.size)
      setPreviewAttachment({ url, fileName, mimeType: finalMimeType })
    } catch (error: any) {
      console.error('Failed to preview attachment:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.message || t('common.errorMessage'),
        variant: 'destructive',
      })
    }
  }

  const closePreview = () => {
    if (previewAttachment?.url) {
      window.URL.revokeObjectURL(previewAttachment.url)
    }
    setPreviewAttachment(null)
  }

  const handlePrintClosure = (closure: CustodyClosure) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const branchName = getLocalizedName({ nameAr: closure.branchNameAr, nameEn: closure.branchNameEn }) || '-'
    const vatOptions = [
      { value: 15, label: 'VAT 15%' },
      { value: 5, label: 'VAT 5%' },
      { value: 0, label: 'VAT 0%' },
    ]

    const printContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${closure.closureNumber || `CC${closure.id}`}</title>
          ${isArabic ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">' : ''}
          <style>
            body { 
              font-family: ${isArabic ? "'Cairo', 'Arial'" : "'Arial'"}, sans-serif; 
              padding: 20px; 
              direction: ${isArabic ? 'rtl' : 'ltr'};
            }
            h1 { font-size: 24px; margin-bottom: 20px; }
            h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: ${isArabic ? 'left' : 'right'}; direction: ltr; }
            .text-center { text-align: center; }
            .info-row { margin: 8px 0; }
            .info-label { font-weight: bold; display: inline-block; min-width: 150px; }
            .summary-table { margin-top: 20px; }
            .summary-table td { font-weight: bold; }
            @media print {
              body { padding: 10px; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>${t('custodyClosures.title')}</h1>
          
          <div class="info-row">
            <span class="info-label">${t('custodyClosures.closureNumber')}:</span>
            <span>${closure.closureNumber || `#${closure.id}`}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${t('custodyClosures.closureDate')}:</span>
            <span>${formatDateUtil(closure.closureDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${t('custodyClosures.branch')}:</span>
            <span>${branchName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${t('custodyClosures.custodyManager')}:</span>
            <span>${closure.custodyManagerName || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${t('custodyClosures.closedBy')}:</span>
            <span>${closure.closedByName || '-'}</span>
          </div>

          <h2>${t('custodyClosures.invoiceDetails')}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('custodyClosures.invoiceNumber')}</th>
                <th class="text-right">${t('custodyClosures.amountWithoutTax')}</th>
                <th class="text-right">${t('custodyClosures.discount')}</th>
                <th class="text-right">${t('custodyClosures.amountAfterDiscount')}</th>
                <th>${t('custodyClosures.tax')} / VAT</th>
                <th class="text-right">${t('custodyClosures.total')}</th>
                <th>${t('custodyClosures.description')}</th>
              </tr>
            </thead>
            <tbody>
              ${(closure.invoices || []).map(invoice => {
                const vatLabel = vatOptions.find(v => v.value === invoice.taxRate)?.label || `${invoice.taxRate}%`
                return `
                  <tr>
                    <td>${invoice.invoiceNumber || '-'}</td>
                    <td class="text-right">${formatNumber(invoice.amountWithoutTax)}</td>
                    <td class="text-right">${formatNumber(invoice.discount)}</td>
                    <td class="text-right">${formatNumber(invoice.amountAfterDiscount)}</td>
                    <td>${vatLabel}</td>
                    <td class="text-right">${formatNumber(invoice.total)}</td>
                    <td>${invoice.description || '-'}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td>${t('custodyClosures.totalExclTax')}:</td>
              <td class="text-right">${formatNumber(closure.totalExclTax)}</td>
            </tr>
            <tr>
              <td>${t('custodyClosures.totalDiscount')}:</td>
              <td class="text-right">${formatNumber(closure.totalDiscount)}</td>
            </tr>
            <tr>
              <td>${t('custodyClosures.totalTax')}:</td>
              <td class="text-right">${formatNumber(closure.totalTax)}</td>
            </tr>
            <tr>
              <td><strong>${t('custodyClosures.grandTotal')}:</strong></td>
              <td class="text-right"><strong>${formatNumber(closure.grandTotal)}</strong></td>
            </tr>
          </table>

          ${closure.notes ? `
            <h2>${t('custodyClosures.closureNotes')}</h2>
            <p>${closure.notes}</p>
          ` : ''}
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const filteredClosures = closures.filter(closure => {
    const searchLower = searchTerm.toLowerCase()
    const branchName = getLocalizedName({ nameAr: closure.branchNameAr, nameEn: closure.branchNameEn }) || ''
    return (
      (closure.closureNumber?.toLowerCase().includes(searchLower) || false) ||
      closure.id?.toString().includes(searchLower) ||
      branchName.toLowerCase().includes(searchLower) ||
      closure.custodyManagerName?.toLowerCase().includes(searchLower) ||
      closure.closedByName?.toLowerCase().includes(searchLower) ||
      closure.invoices?.some(inv => inv.invoiceNumber.toLowerCase().includes(searchLower))
    )
  })

  if (viewingClosure) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('custodyClosures.title')}</h1>
          <div className="flex gap-2">
            <Button onClick={() => handlePrintClosure(viewingClosure)}>
              <Printer className="w-4 h-4 me-2" />
              {t('custodyClosures.print')}
            </Button>
            <Button onClick={() => setViewingClosure(null)}>
              <X className="w-4 h-4 me-2" />
              {t('common.close')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('custodyClosures.viewClosure')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {/* Basic Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label>{t('custodyClosures.closureDate')}</Label>
                <p className="mt-1">{formatDateUtil(viewingClosure.closureDate)}</p>
              </div>
              <div>
                <Label>{t('custodyClosures.custodyManager')}</Label>
                <p className="mt-1">{viewingClosure.custodyManagerName}</p>
              </div>
              <div>
                <Label>{t('custodyClosures.closedBy')}</Label>
                <p className="mt-1">{viewingClosure.closedByName}</p>
              </div>
              <div>
                <Label>{t('custodyClosures.branch')}</Label>
                <p className="mt-1">
                  {viewingClosure.branchName || '-'}
                </p>
              </div>
            </div>

            {/* Invoices Table */}
            <div>
              <Label className="text-base font-semibold mb-2 block">{t('custodyClosures.invoiceDetails')}</Label>
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.invoiceNumber')}</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.amountWithoutTax')}</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.discount')}</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.amountAfterDiscount')}</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.tax')} / VAT</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.total')}</TableHead>
                      <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.description')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingClosure.invoices?.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell className="!p-2 text-xs">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="!p-2 text-xs">{formatNumber(invoice.amountWithoutTax)}</TableCell>
                        <TableCell className="!p-2 text-xs">{formatNumber(invoice.discount)}</TableCell>
                        <TableCell className="!p-2 text-xs">{formatNumber(invoice.amountAfterDiscount)}</TableCell>
                        <TableCell className="!p-2 text-xs">
                          {invoice.taxRate ? `VAT ${invoice.taxRate}%` : '-'} ({formatNumber(invoice.tax)})
                        </TableCell>
                        <TableCell className="!p-2 text-xs">{formatNumber(invoice.total)}</TableCell>
                        <TableCell className="!p-2 text-xs">{invoice.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Financial Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('custodyClosures.financialSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-sm text-gray-500">{t('custodyClosures.totalExclTax')}</Label>
                    <p className="text-lg font-bold">{formatNumber(viewingClosure.totalExclTax)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">{t('custodyClosures.totalDiscount')}</Label>
                    <p className="text-lg font-bold">{formatNumber(viewingClosure.totalDiscount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">{t('custodyClosures.totalTax')}</Label>
                    <p className="text-lg font-bold">{formatNumber(viewingClosure.totalTax)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">{t('custodyClosures.grandTotal')}</Label>
                    <p className="text-lg font-bold text-red-600">{formatNumber(viewingClosure.grandTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {viewingClosure.attachments && viewingClosure.attachments.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-2 block">{t('custodyClosures.attachments')}</Label>
                <div className="space-y-1.5">
                  {viewingClosure.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span>{attachment.fileName}</span>
                        <span className="text-sm text-gray-500">
                          ({(attachment.fileSize / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewAttachment(viewingClosure.id!, attachment.id, attachment.fileName, attachment.mimeType)}
                          title={t('custodyClosures.preview')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(viewingClosure.id!, attachment.id, attachment.fileName)}
                          title={t('custodyClosures.download')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {viewingClosure.notes && (
              <div>
                <Label>{t('custodyClosures.closureNotes')}</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded border">{viewingClosure.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {previewAttachment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75" onClick={closePreview}>
            <div className="relative bg-white rounded-lg shadow-lg max-w-6xl max-h-[90vh] w-full m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{previewAttachment.fileName}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = previewAttachment.url
                      link.setAttribute('download', previewAttachment.fileName)
                      document.body.appendChild(link)
                      link.click()
                      link.remove()
                    }}
                  >
                    <Download className="w-4 h-4 me-2" />
                    {t('custodyClosures.download')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={closePreview}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {previewAttachment.mimeType?.startsWith('image/') ? (
                  <img 
                    src={previewAttachment.url} 
                    alt={previewAttachment.fileName}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewAttachment.mimeType === 'application/pdf' || previewAttachment.fileName.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-[calc(90vh-120px)] border rounded">
                    <iframe
                      src={previewAttachment.url}
                      className="w-full h-full"
                      title={previewAttachment.fileName}
                      style={{ minHeight: '600px' }}
                    />
                  </div>
                ) : previewAttachment.mimeType?.startsWith('text/') ? (
                  <iframe
                    src={previewAttachment.url}
                    className="w-full h-[calc(90vh-120px)] border"
                    title={previewAttachment.fileName}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] text-gray-500">
                    <File className="w-16 h-16 mb-4" />
                    <p className="text-lg">{t('custodyClosures.previewNotAvailable')}</p>
                    <p className="text-sm mt-2">{t('custodyClosures.downloadToView')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {editingClosure ? t('custodyClosures.editClosure') : t('custodyClosures.newClosure')}
          </h1>
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 me-2" />
            {t('common.cancel')}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Basic Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('custodyClosures.basicData')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="closureDate" className="text-sm">{t('custodyClosures.closureDate')} *</Label>
                  <Input
                    id="closureDate"
                    type="date"
                    value={formData.closureDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, closureDate: e.target.value }))}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t('custodyClosures.custodyManager')} *</Label>
                  <SearchableSelect
                    options={users.map(u => ({
                      value: u.id,
                      label: `${u.firstName} ${u.lastName}`,
                      searchText: `${u.firstName} ${u.lastName} ${u.email}`,
                    }))}
                    value={formData.custodyManagerId}
                    onChange={(value) => {
                      const user = users.find(u => u.id === value)
                      setFormData(prev => ({
                        ...prev,
                        custodyManagerId: value as number,
                        custodyManagerName: user ? `${user.firstName} ${user.lastName}` : '',
                      }))
                    }}
                    placeholder={t('custodyClosures.selectCustodyManager')}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t('custodyClosures.closedBy')} *</Label>
                  <SearchableSelect
                    options={users.map(u => ({
                      value: u.id,
                      label: `${u.firstName} ${u.lastName}`,
                      searchText: `${u.firstName} ${u.lastName} ${u.email}`,
                    }))}
                    value={formData.closedById}
                    onChange={(value) => {
                      const user = users.find(u => u.id === value)
                      setFormData(prev => ({
                        ...prev,
                        closedById: value as number,
                        closedByName: user ? `${user.firstName} ${user.lastName}` : '',
                      }))
                    }}
                    placeholder={t('custodyClosures.selectClosedBy')}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t('custodyClosures.branch')}</Label>
                  <SearchableSelect
                    options={branches.map(b => ({
                      value: b.id,
                      label: getLocalizedName(b),
                      searchText: isArabic ? b.nameEn : b.nameAr,
                    }))}
                    value={formData.branchId ?? 0}
                    onChange={(value) => {
                      const branch = branches.find(b => b.id === value)
                      setFormData(prev => ({
                        ...prev,
                        branchId: value as number,
                        branchName: branch ? getLocalizedName(branch) : '',
                        branchNameAr: branch?.nameAr,
                        branchNameEn: branch?.nameEn,
                      }))
                    }}
                    placeholder={t('custodyClosures.selectBranch')}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('custodyClosures.invoiceDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.invoiceNumber')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.amountWithoutTax')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.discount')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.amountAfterDiscount')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.tax')} / VAT</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.total')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('custodyClosures.description')}</TableHead>
                    <TableHead className="!p-2 text-xs font-semibold whitespace-nowrap">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.invoices.map((invoice, index) => (
                    <TableRow key={index}>
                      <TableCell className="!p-2">
                        <Input
                          value={invoice.invoiceNumber}
                          onChange={(e) => updateInvoiceCalculations(index, 'invoiceNumber', e.target.value)}
                          placeholder={t('custodyClosures.invoiceNumberPlaceholder')}
                          className="w-full min-w-[100px] h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={invoice.amountWithoutTax || ''}
                          onChange={(e) => updateInvoiceCalculations(index, 'amountWithoutTax', e.target.value)}
                          className="w-full min-w-[100px] h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={invoice.discount || ''}
                          onChange={(e) => updateInvoiceCalculations(index, 'discount', e.target.value)}
                          className="w-full min-w-[80px] h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Input
                          type="text"
                          value={formatNumber(invoice.amountAfterDiscount)}
                          readOnly
                          className="w-full min-w-[100px] h-8 text-xs bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <SearchableSelect
                          options={[
                            { value: 15, label: 'VAT 15%', searchText: 'VAT 15%' },
                            { value: 5, label: 'VAT 5%', searchText: 'VAT 5%' },
                            { value: 0, label: 'VAT 0%', searchText: 'VAT 0%' },
                          ]}
                          value={invoice.taxRate || 0}
                          onChange={(value) => updateInvoiceCalculations(index, 'taxRate', value)}
                          className="w-full min-w-[80px] h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Input
                          type="text"
                          value={formatNumber(invoice.total)}
                          readOnly
                          className="w-full min-w-[100px] h-8 text-xs bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Input
                          value={invoice.description || ''}
                          onChange={(e) => updateInvoiceCalculations(index, 'description', e.target.value)}
                          placeholder={t('custodyClosures.descriptionPlaceholder')}
                          className="w-full min-w-[120px] h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="!p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInvoice(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              {formData.invoices.length === 0 && (
                <p className="text-center text-gray-500 py-4">{t('custodyClosures.noInvoices')}</p>
              )}
              <div className="mt-3 flex justify-end">
                <Button type="button" onClick={handleAddInvoice} variant="outline" size="sm">
                  <Plus className="w-4 h-4 me-2" />
                  {t('custodyClosures.addInvoice')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t('custodyClosures.financialSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">{t('custodyClosures.totalExclTax')}</Label>
                  <p className="text-lg font-bold">{formatNumber(formData.totalExclTax)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">{t('custodyClosures.totalDiscount')}</Label>
                  <p className="text-lg font-bold">{formatNumber(formData.totalDiscount)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">{t('custodyClosures.totalTax')}</Label>
                  <p className="text-lg font-bold">{formatNumber(formData.totalTax)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">{t('custodyClosures.grandTotal')}</Label>
                  <p className="text-lg font-bold text-red-600">{formatNumber(formData.grandTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('custodyClosures.attachments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              <div>
                <Label htmlFor="fileUpload">{t('custodyClosures.uploadFiles')}</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </div>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span>{file.name}</span>
                        <span className="text-sm text-gray-500">
                          ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t('custodyClosures.existingAttachments')}</Label>
                  {formData.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span>{attachment.fileName}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewAttachment(formData.id!, attachment.id, attachment.fileName, attachment.mimeType)}
                          title={t('custodyClosures.preview')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(formData.id!, attachment.id, attachment.fileName)}
                          title={t('custodyClosures.download')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closure Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('custodyClosures.closureNotes')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('custodyClosures.notesPlaceholder')}
                rows={3}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>

        {/* Preview Modal */}
        {previewAttachment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75" onClick={closePreview}>
            <div className="relative bg-white rounded-lg shadow-lg max-w-6xl max-h-[90vh] w-full m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{previewAttachment.fileName}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = previewAttachment.url
                      link.setAttribute('download', previewAttachment.fileName)
                      document.body.appendChild(link)
                      link.click()
                      link.remove()
                    }}
                  >
                    <Download className="w-4 h-4 me-2" />
                    {t('custodyClosures.download')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={closePreview}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {previewAttachment.mimeType?.startsWith('image/') ? (
                  <img 
                    src={previewAttachment.url} 
                    alt={previewAttachment.fileName}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewAttachment.mimeType === 'application/pdf' || previewAttachment.fileName.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-[calc(90vh-120px)] border rounded">
                    <iframe
                      src={previewAttachment.url}
                      className="w-full h-full"
                      title={previewAttachment.fileName}
                      style={{ minHeight: '600px' }}
                    />
                  </div>
                ) : previewAttachment.mimeType?.startsWith('text/') ? (
                  <iframe
                    src={previewAttachment.url}
                    className="w-full h-[calc(90vh-120px)] border"
                    title={previewAttachment.fileName}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] text-gray-500">
                    <File className="w-16 h-16 mb-4" />
                    <p className="text-lg">{t('custodyClosures.previewNotAvailable')}</p>
                    <p className="text-sm mt-2">{t('custodyClosures.downloadToView')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('custodyClosures.title')}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('custodyClosures.newClosure')}
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={t('custodyClosures.searchClosures')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Closures List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('custodyClosures.closuresList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : filteredClosures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('custodyClosures.noClosures')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('custodyClosures.closureNumber') || 'Closure Number'}</TableHead>
                  <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('custodyClosures.closureDate')}</TableHead>
                  <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('custodyClosures.branch')}</TableHead>
                  <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('custodyClosures.custodyManager')}</TableHead>
                  <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('custodyClosures.closedBy')}</TableHead>
                  <TableHead style={{ textAlign: isArabic ? 'left' : 'right' }}>{t('custodyClosures.grandTotal')}</TableHead>
                  <TableHead style={{ textAlign: 'center' }}>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClosures.map((closure) => (
                  <TableRow key={closure.id}>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {closure.closureNumber || `#${closure.id}`}
                    </TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{formatDateUtil(closure.closureDate)}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {(() => {
                        const branchName = getLocalizedName({ nameAr: closure.branchNameAr, nameEn: closure.branchNameEn })
                        if (branchName) return branchName
                        // If branchId exists but no name, try to find it from branches list
                        if (closure.branchId && branches.length > 0) {
                          const branch = branches.find(b => b.id === closure.branchId)
                          if (branch) return getLocalizedName(branch)
                        }
                        return '-'
                      })()}
                    </TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{closure.custodyManagerName}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{closure.closedByName}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'left' : 'right' }}>{formatNumber(closure.grandTotal)}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(closure.id!)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(closure)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintClosure(closure)}
                          title={t('custodyClosures.print')}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(closure.id!)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75" onClick={closePreview}>
          <div className="relative bg-white rounded-lg shadow-lg max-w-6xl max-h-[90vh] w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{previewAttachment.fileName}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewAttachment.url
                    link.setAttribute('download', previewAttachment.fileName)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                  }}
                >
                  <Download className="w-4 h-4 me-2" />
                  {t('custodyClosures.download')}
                </Button>
                <Button variant="outline" size="sm" onClick={closePreview}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewAttachment.mimeType?.startsWith('image/') ? (
                <img 
                  src={previewAttachment.url} 
                  alt={previewAttachment.fileName}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewAttachment.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[calc(90vh-120px)] border-0"
                  title={previewAttachment.fileName}
                />
              ) : previewAttachment.mimeType?.startsWith('text/') ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[calc(90vh-120px)] border"
                  title={previewAttachment.fileName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] text-gray-500">
                  <File className="w-16 h-16 mb-4" />
                  <p className="text-lg">{t('custodyClosures.previewNotAvailable')}</p>
                  <p className="text-sm mt-2">{t('custodyClosures.downloadToView')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
