'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Plus, Send, Eye, Download, Trash2, Receipt } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  student_id: string
  student_name: string
  student_admission_number: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  status: string
  payment_status: string
  notes?: string
  created_at: string
}

interface Student {
  id: string
  student_id: string
  admission_number: string
  profile: {
    name: string
    email: string
  }
  class: {
    name: string
  }
}

export default function InvoiceManagement() {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchInvoices()
    fetchStudents()
  }, [user])

  const fetchInvoices = async () => {
    if (!user?.school_id || !user?.id) return

    try {
      const response = await fetch(`/api/fees/invoices?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (result.success) {
        setInvoices(result.data.invoices)
      } else {
        toast.error('Failed to fetch invoices')
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Error fetching invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    if (!user?.school_id || !user?.id) return

    try {
      const response = await fetch(`/api/students?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (result.success) {
        setStudents(result.data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleCreateInvoice = async (invoiceData: any) => {
    try {
      // Transform the form data to match API expectations
      const apiData = {
        school_id: user?.school_id,
        user_id: user?.id,
        invoice: {
          student_id: invoiceData.student_id,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          subtotal: invoiceData.subtotal,
          tax_amount: invoiceData.tax_amount,
          discount_amount: invoiceData.discount_amount,
          notes: invoiceData.notes
        },
        line_items: [
          {
            description: invoiceData.description || 'Fee Payment',
            quantity: 1,
            unit_price: invoiceData.subtotal
          }
        ]
      }

      const response = await fetch('/api/fees/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Invoice created successfully')
        setShowCreateModal(false)
        fetchInvoices()
      } else {
        toast.error(result.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Failed to create invoice')
    }
  }

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/fees/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user?.school_id,
          user_id: user?.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Invoice sent successfully')
        fetchInvoices()
      } else {
        toast.error(result.error || 'Failed to send invoice')
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice')
    }
  }

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/fees/invoices/${invoiceId}?school_id=${user?.school_id}&user_id=${user?.id}`)
      const result = await response.json()

      if (result.success) {
        // For now, just show a toast. In a real app, you'd open a modal or navigate to a detail page
        toast.success('Invoice details loaded')
        console.log('Invoice details:', result.data)
        // TODO: Open invoice detail modal or navigate to detail page
      } else {
        toast.error(result.error || 'Failed to load invoice details')
      }
    } catch (error) {
      console.error('Error viewing invoice:', error)
      toast.error('Failed to load invoice details')
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/fees/invoices/${invoiceId}/download?school_id=${user?.school_id}&user_id=${user?.id}`)
      const result = await response.json()

      if (result.success) {
        // For now, just show a toast. In a real app, you'd generate and download a PDF
        toast.success('Invoice download prepared')
        console.log('Invoice download data:', result.data)
        // TODO: Generate PDF and trigger download
      } else {
        toast.error(result.error || 'Failed to prepare invoice download')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Failed to download invoice')
    }
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/fees/invoices/${invoice.id}?school_id=${user?.school_id}&user_id=${user?.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Invoice deleted successfully')
        fetchInvoices()
      } else {
        toast.error(result.error || 'Failed to delete invoice')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Failed to delete invoice')
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.student_admission_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus
    const matchesPaymentStatus = filterPaymentStatus === 'all' || invoice.payment_status === filterPaymentStatus

    return matchesSearch && matchesStatus && matchesPaymentStatus
  })

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      overdue: 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">
            Create, manage, and track student invoices
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new invoice for a student
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              students={students}
              onSubmit={handleCreateInvoice}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.student_name}</p>
                          <p className="text-sm text-gray-500">{invoice.student_admission_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        ${invoice.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ${invoice.paid_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusBadge(invoice.payment_status)}>
                          {invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice.id)}
                            title="View Invoice Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendInvoice(invoice.id)}
                              title="Send Invoice"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.payment_status !== 'paid' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Delete Invoice"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete invoice "{invoice.invoice_number}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteInvoice(invoice)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Invoice
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Invoice Form Component
function InvoiceForm({ 
  students, 
  onSubmit, 
  onCancel 
}: {
  students: Student[]
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    student_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: 'Fee Payment',
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.student_id || !formData.due_date || !formData.description || formData.subtotal <= 0) {
      toast.error('Please fill in all required fields and ensure amount is greater than 0')
      return
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="student_id">Student *</Label>
        <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(student => (
              <SelectItem key={student.id} value={student.id}>
                {student.profile.name} ({student.admission_number}) - {student.class.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Fee description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice_date">Invoice Date *</Label>
          <Input
            id="invoice_date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subtotal">Subtotal</Label>
          <Input
            id="subtotal"
            type="number"
            min="0"
            step="0.01"
            value={formData.subtotal}
            onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_amount">Tax Amount</Label>
          <Input
            id="tax_amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.tax_amount}
            onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount_amount">Discount</Label>
          <Input
            id="discount_amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.discount_amount}
            onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Invoice
        </Button>
      </div>
    </form>
  )
}
