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
import { toast } from 'sonner'
import { 
  BookmarkPlus, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Book,
  Calendar
} from 'lucide-react'

interface Reservation {
  id: string
  member_id: string
  book_id: string
  reservation_date: string
  expiry_date: string
  status: string
  priority: number
  notes: string | null
  member: {
    library_card_number: string
    profile: {
      name: string
      email: string
    }
  }
  book: {
    title: string
    authors: string[]
    isbn: string
    total_copies: number
    available_copies: number
  }
}

export default function LibraryReservationsPage() {
  const { user } = useAuthStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFulfillModal, setShowFulfillModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  useEffect(() => {
    fetchReservations()
  }, [currentPage, searchTerm, selectedStatus])

  const fetchReservations = async () => {
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

      const response = await fetch(`/api/admin/library/reservations?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReservations(data.reservations || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error('Failed to fetch reservations')
      }
    } catch (error) {
      console.error('Error fetching reservations:', error)
      toast.error('Failed to fetch reservations')
    } finally {
      setLoading(false)
    }
  }

  const handleFulfillReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/library/reservations/${reservationId}/fulfill`, {
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
        toast.success('Reservation fulfilled successfully!')
        setShowFulfillModal(false)
        setSelectedReservation(null)
        fetchReservations()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to fulfill reservation')
      }
    } catch (error) {
      console.error('Error fulfilling reservation:', error)
      toast.error('Failed to fulfill reservation')
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/library/reservations/${reservationId}/cancel`, {
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
        toast.success('Reservation cancelled successfully!')
        fetchReservations()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel reservation')
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error('Failed to cancel reservation')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'expired':
        return <Calendar className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <AdminLayout title="Library Reservations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Book Reservations</h2>
            <p className="text-muted-foreground">
              Manage book reservations and holds
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Reservations</p>
                  <p className="text-2xl font-bold">
                    {reservations.filter(r => r.status === 'active').length}
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
                  <p className="text-sm font-medium text-gray-600">Fulfilled Today</p>
                  <p className="text-2xl font-bold">
                    {reservations.filter(r => 
                      r.status === 'fulfilled' && 
                      new Date(r.reservation_date).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold">
                    {reservations.filter(r => 
                      r.status === 'active' && 
                      getDaysUntilExpiry(r.expiry_date) <= 3 && 
                      getDaysUntilExpiry(r.expiry_date) > 0
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-2xl font-bold">
                    {reservations.filter(r => 
                      r.status === 'active' && isExpired(r.expiry_date)
                    ).length}
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
                    placeholder="Search by member name, book title, or card number..."
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
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reservations ({reservations.length})</CardTitle>
            <CardDescription>
              Complete list of book reservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8">
                <BookmarkPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reservations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Reserved Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reservation.member.profile.name}</div>
                            <div className="text-sm text-gray-500">
                              Card: {reservation.member.library_card_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reservation.book.title}</div>
                            <div className="text-sm text-gray-500">
                              By: {reservation.book.authors.join(', ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Available: {reservation.book.available_copies}/{reservation.book.total_copies}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(reservation.reservation_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className={`${isExpired(reservation.expiry_date) && reservation.status === 'active' ? 'text-red-600 font-medium' : ''}`}>
                            {new Date(reservation.expiry_date).toLocaleDateString()}
                            {reservation.status === 'active' && (
                              <div className="text-xs text-gray-500">
                                {getDaysUntilExpiry(reservation.expiry_date) >= 0 
                                  ? `${getDaysUntilExpiry(reservation.expiry_date)} days left`
                                  : `Expired ${Math.abs(getDaysUntilExpiry(reservation.expiry_date))} days ago`
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">#{reservation.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(isExpired(reservation.expiry_date) && reservation.status === 'active' ? 'expired' : reservation.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(isExpired(reservation.expiry_date) && reservation.status === 'active' ? 'expired' : reservation.status)}
                              <span>{isExpired(reservation.expiry_date) && reservation.status === 'active' ? 'expired' : reservation.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {reservation.status === 'active' && reservation.book.available_copies > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFulfillReservation(reservation.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Fulfill
                              </Button>
                            )}
                            {reservation.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelReservation(reservation.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
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
    </AdminLayout>
  )
}
