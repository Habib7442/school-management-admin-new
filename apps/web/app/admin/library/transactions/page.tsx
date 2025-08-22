'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  RotateCcw,
  Calendar,
  User,
  Book,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Transaction {
  id: string
  member_id: string
  book_copy_id: string
  checkout_date: string
  due_date: string
  return_date: string | null
  status: string
  renewal_count: number
  fine_amount: number
  notes: string | null
  member: {
    library_card_number: string
    profile: {
      name: string
      email: string
    }
  }
  book_copy: {
    barcode: string
    book: {
      title: string
      authors: string[]
      isbn: string
    }
  }
}

interface CheckoutFormData {
  memberCardNumber: string
  bookBarcode: string
  dueDays: number
  notes: string
}

export default function LibraryTransactionsPage() {
  const { user } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>({
    memberCardNumber: '',
    bookBarcode: '',
    dueDays: 14,
    notes: ''
  })

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, searchTerm, selectedStatus])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        school_id: user!.school_id,
        user_id: user!.id,
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        status: selectedStatus
      })

      const response = await fetch(`/api/admin/library/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error('Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!checkoutForm.memberCardNumber || !checkoutForm.bookBarcode) {
      toast.error('Member card number and book barcode are required')
      return
    }

    try {
      const response = await fetch('/api/admin/library/transactions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...checkoutForm,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Book checked out successfully!')
        setShowCheckoutModal(false)
        setCheckoutForm({
          memberCardNumber: '',
          bookBarcode: '',
          dueDays: 14,
          notes: ''
        })
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to checkout book')
      }
    } catch (error) {
      console.error('Error checking out book:', error)
      toast.error('Failed to checkout book')
    }
  }

  const handleReturn = async (transactionId: string, condition: string = 'good', notes: string = '') => {
    try {
      const response = await fetch(`/api/admin/library/transactions/${transactionId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condition,
          notes,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Book returned successfully!')
        setShowReturnModal(false)
        setSelectedTransaction(null)
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to return book')
      }
    } catch (error) {
      console.error('Error returning book:', error)
      toast.error('Failed to return book')
    }
  }

  const handleRenew = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/admin/library/transactions/${transactionId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Book renewed successfully!')
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to renew book')
      }
    } catch (error) {
      console.error('Error renewing book:', error)
      toast.error('Failed to renew book')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'returned':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'lost':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <BookOpen className="h-4 w-4" />
      case 'returned':
        return <CheckCircle className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'lost':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'active' && new Date(dueDate) < new Date()
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <AdminLayout title="Library Transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Library Transactions</h2>
            <p className="text-muted-foreground">
              Manage book checkouts, returns, and renewals
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowCheckoutModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Checkout Book
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Loans</p>
                  <p className="text-2xl font-bold">
                    {transactions.filter(t => t.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">
                    {transactions.filter(t => t.status === 'overdue').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Returned Today</p>
                  <p className="text-2xl font-bold">
                    {transactions.filter(t => 
                      t.status === 'returned' && 
                      t.return_date && 
                      new Date(t.return_date).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <RotateCcw className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Renewals</p>
                  <p className="text-2xl font-bold">
                    {transactions.reduce((sum, t) => sum + t.renewal_count, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by member name, book title, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({transactions.length})</CardTitle>
            <CardDescription>
              Complete list of library transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowCheckoutModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Checkout First Book
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Checkout Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Renewals</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.member.profile.name}</div>
                            <div className="text-sm text-gray-500">
                              Card: {transaction.member.library_card_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.book_copy.book.title}</div>
                            <div className="text-sm text-gray-500">
                              By: {transaction.book_copy.book.authors.join(', ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Barcode: {transaction.book_copy.barcode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.checkout_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className={`${isOverdue(transaction.due_date, transaction.status) ? 'text-red-600 font-medium' : ''}`}>
                            {new Date(transaction.due_date).toLocaleDateString()}
                            {transaction.status === 'active' && (
                              <div className="text-xs text-gray-500">
                                {getDaysUntilDue(transaction.due_date) >= 0 
                                  ? `${getDaysUntilDue(transaction.due_date)} days left`
                                  : `${Math.abs(getDaysUntilDue(transaction.due_date))} days overdue`
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(isOverdue(transaction.due_date, transaction.status) ? 'overdue' : transaction.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(isOverdue(transaction.due_date, transaction.status) ? 'overdue' : transaction.status)}
                              <span>{isOverdue(transaction.due_date, transaction.status) ? 'overdue' : transaction.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.renewal_count}</TableCell>
                        <TableCell>
                          {transaction.fine_amount > 0 ? (
                            <span className="text-red-600 font-medium">
                              ${transaction.fine_amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-600">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {transaction.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRenew(transaction.id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransaction(transaction)
                                    setShowReturnModal(true)
                                  }}
                                >
                                  Return
                                </Button>
                              </>
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

        {/* Checkout Modal */}
        <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Checkout Book</DialogTitle>
              <DialogDescription>
                Scan or enter member card and book barcode to checkout
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberCardNumber">Member Card Number</Label>
                <Input
                  id="memberCardNumber"
                  value={checkoutForm.memberCardNumber}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, memberCardNumber: e.target.value }))}
                  placeholder="Scan or enter card number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookBarcode">Book Barcode</Label>
                <Input
                  id="bookBarcode"
                  value={checkoutForm.bookBarcode}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, bookBarcode: e.target.value }))}
                  placeholder="Scan or enter book barcode"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDays">Due in (days)</Label>
                <Select 
                  value={checkoutForm.dueDays.toString()} 
                  onValueChange={(value) => setCheckoutForm(prev => ({ ...prev, dueDays: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="21">21 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special notes"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCheckoutModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Checkout Book
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Return Modal */}
        <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Book</DialogTitle>
              <DialogDescription>
                Return "{selectedTransaction?.book_copy.book.title}" for {selectedTransaction?.member.profile.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Book Condition</Label>
                <Select defaultValue="good">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => selectedTransaction && handleReturn(selectedTransaction.id)}>
                  Return Book
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
