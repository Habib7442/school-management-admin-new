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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  CreditCard
} from 'lucide-react'

interface Fine {
  id: string
  member_id: string
  transaction_id: string | null
  amount: number
  reason: string
  description: string
  status: string
  created_date: string
  paid_date: string | null
  waived_date: string | null
  waived_reason: string | null
  member: {
    library_card_number: string
    profile: {
      name: string
      email: string
      phone: string | null
    }
  }
  transaction?: {
    book_copy: {
      book: {
        title: string
        authors: string[]
      }
    }
  }
}

export default function LibraryFinesPage() {
  const { user } = useAuthStore()
  const [fines, setFines] = useState<Fine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWaiveModal, setShowWaiveModal] = useState(false)
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  useEffect(() => {
    fetchFines()
  }, [currentPage, searchTerm, selectedStatus])

  const fetchFines = async () => {
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

      const response = await fetch(`/api/admin/library/fines?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFines(data.fines || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error('Failed to fetch fines')
      }
    } catch (error) {
      console.error('Error fetching fines:', error)
      toast.error('Failed to fetch fines')
    } finally {
      setLoading(false)
    }
  }

  const handlePayFine = async () => {
    if (!selectedFine || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    try {
      const response = await fetch(`/api/admin/library/fines/${selectedFine.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Fine payment recorded successfully!')
        setShowPaymentModal(false)
        setSelectedFine(null)
        setPaymentAmount('')
        fetchFines()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      console.error('Error paying fine:', error)
      toast.error('Failed to record payment')
    }
  }

  const handleWaiveFine = async () => {
    if (!selectedFine || !waiveReason.trim()) {
      toast.error('Please provide a reason for waiving the fine')
      return
    }

    try {
      const response = await fetch(`/api/admin/library/fines/${selectedFine.id}/waive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: waiveReason,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Fine waived successfully!')
        setShowWaiveModal(false)
        setSelectedFine(null)
        setWaiveReason('')
        fetchFines()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to waive fine')
      }
    } catch (error) {
      console.error('Error waiving fine:', error)
      toast.error('Failed to waive fine')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unpaid':
        return 'bg-red-100 text-red-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'waived':
        return 'bg-blue-100 text-blue-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unpaid':
        return <AlertTriangle className="h-4 w-4" />
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'waived':
        return <XCircle className="h-4 w-4" />
      case 'partial':
        return <DollarSign className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getTotalUnpaidFines = () => {
    return fines
      .filter(fine => fine.status === 'unpaid')
      .reduce((sum, fine) => sum + fine.amount, 0)
  }

  const getTotalPaidFines = () => {
    return fines
      .filter(fine => fine.status === 'paid')
      .reduce((sum, fine) => sum + fine.amount, 0)
  }

  return (
    <AdminLayout title="Library Fines Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Library Fines</h2>
            <p className="text-muted-foreground">
              Manage library fines and payments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unpaid Fines</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${getTotalUnpaidFines().toFixed(2)}
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
                  <p className="text-sm font-medium text-gray-600">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${getTotalPaidFines().toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Members with Fines</p>
                  <p className="text-2xl font-bold">
                    {new Set(fines.filter(f => f.status === 'unpaid').map(f => f.member_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Waived Fines</p>
                  <p className="text-2xl font-bold">
                    {fines.filter(f => f.status === 'waived').length}
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
                    placeholder="Search by member name, card number, or book title..."
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
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fines Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fines ({fines.length})</CardTitle>
            <CardDescription>
              Complete list of library fines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fines.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No fines found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fines.map((fine) => (
                      <TableRow key={fine.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{fine.member.profile.name}</div>
                            <div className="text-sm text-gray-500">
                              Card: {fine.member.library_card_number}
                            </div>
                            {fine.member.profile.phone && (
                              <div className="text-sm text-gray-500">
                                {fine.member.profile.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-lg">
                            ${fine.amount.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">{fine.reason}</div>
                            {fine.description && (
                              <div className="text-sm text-gray-500">{fine.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fine.transaction?.book_copy ? (
                            <div>
                              <div className="font-medium">{fine.transaction.book_copy.book.title}</div>
                              <div className="text-sm text-gray-500">
                                By: {fine.transaction.book_copy.book.authors.join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(fine.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(fine.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(fine.status)}
                              <span className="capitalize">{fine.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {fine.status === 'unpaid' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFine(fine)
                                    setPaymentAmount(fine.amount.toString())
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFine(fine)
                                    setShowWaiveModal(true)
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Waive
                                </Button>
                              </>
                            )}
                            {fine.status === 'paid' && fine.paid_date && (
                              <div className="text-sm text-green-600">
                                Paid: {new Date(fine.paid_date).toLocaleDateString()}
                              </div>
                            )}
                            {fine.status === 'waived' && fine.waived_date && (
                              <div className="text-sm text-blue-600">
                                Waived: {new Date(fine.waived_date).toLocaleDateString()}
                              </div>
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

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Fine Payment</DialogTitle>
              <DialogDescription>
                Record payment for {selectedFine?.member.profile.name}'s fine
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-sm text-gray-500">
                  Fine amount: ${selectedFine?.amount.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePayFine}>
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Waive Modal */}
        <Dialog open={showWaiveModal} onOpenChange={setShowWaiveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Waive Fine</DialogTitle>
              <DialogDescription>
                Waive ${selectedFine?.amount.toFixed(2)} fine for {selectedFine?.member.profile.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waiveReason">Reason for waiving</Label>
                <Input
                  id="waiveReason"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Enter reason for waiving this fine"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowWaiveModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWaiveFine}>
                  Waive Fine
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
