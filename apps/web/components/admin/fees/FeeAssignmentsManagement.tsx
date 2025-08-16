'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import {
  Plus,
  Users,
  Search,
  Filter,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserPlus,
  Edit,
  Trash2
} from 'lucide-react'

interface FeeAssignment {
  id: string
  student_id: string
  fee_structure_id: string
  assigned_amount: number
  discount_amount: number
  discount_percentage: number
  final_amount: number
  due_date: string
  academic_year: string
  installments_enabled: boolean
  total_installments: number
  is_active: boolean
  student_name: string
  student_admission_number: string
  fee_structure_name: string
  fee_type: string
  class_name: string
  total_paid: number
  balance_amount: number
  payment_status: 'pending' | 'partial' | 'paid'
  installment_count: number
  paid_installments: number
  created_at: string
}

interface FeeStructure {
  id: string
  name: string
  fee_type: string
  base_amount: number
  academic_year: string
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

export default function FeeAssignmentsManagement() {
  const { user } = useAuthStore()
  const [assignments, setAssignments] = useState<FeeAssignment[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterFeeType, setFilterFeeType] = useState<string>('all')
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [showSingleAssignModal, setShowSingleAssignModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<FeeAssignment | null>(null)

  useEffect(() => {
    fetchAssignments()
    fetchFeeStructures()
    fetchStudents()
  }, [user])

  const fetchAssignments = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/fees/assignments?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (result.success) {
        setAssignments(result.data.assignments)
      } else {
        toast.error('Failed to load fee assignments')
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load fee assignments')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeeStructures = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/fees/structures?school_id=${user.school_id}&user_id=${user.id}&is_active=true`)
      const result = await response.json()

      if (result.success) {
        setFeeStructures(result.data.fee_structures)
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error)
    }
  }

  const fetchStudents = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/students?school_id=${user.school_id}`)
      const result = await response.json()

      if (result.success) {
        setStudents(result.data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleSingleAssignment = async (assignmentData: any) => {
    try {
      const response = await fetch('/api/fees/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assignmentData,
          school_id: user?.school_id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Fee assigned successfully')
        setShowSingleAssignModal(false)
        fetchAssignments()
      } else {
        toast.error(result.error || 'Failed to assign fee')
      }
    } catch (error) {
      console.error('Error assigning fee:', error)
      toast.error('Failed to assign fee')
    }
  }

  const handleBulkAssignment = async (bulkData: any) => {
    try {
      const response = await fetch('/api/fees/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bulkData,
          school_id: user?.school_id
        })
      })

      const result = await response.json()

      if (result.success) {
        const { success_count, error_count } = result.data
        toast.success(`Bulk assignment completed: ${success_count} successful, ${error_count} errors`)
        setShowBulkAssignModal(false)
        fetchAssignments()
      } else {
        toast.error(result.error || 'Failed to process bulk assignment')
      }
    } catch (error) {
      console.error('Error in bulk assignment:', error)
      toast.error('Failed to process bulk assignment')
    }
  }

  // Filter assignments based on search and filters
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.student_admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.fee_structure_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || assignment.payment_status === filterStatus
    const matchesFeeType = filterFeeType === 'all' || assignment.fee_type === filterFeeType

    return matchesSearch && matchesStatus && matchesFeeType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>
      case 'pending':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleRecordPayment = (assignment: FeeAssignment) => {
    setSelectedAssignment(assignment)
    setShowPaymentModal(true)
  }

  const handleEditAssignment = (assignment: FeeAssignment) => {
    // Check if assignment has payments
    if (assignment.paid_amount && assignment.paid_amount > 0) {
      toast.warning('Cannot edit assignment with existing payments. You can only edit due date and notes.')
    }
    setSelectedAssignment(assignment)
    setShowEditModal(true)
  }

  const handleDeleteAssignment = async (assignment: FeeAssignment) => {
    // Check if assignment has payments
    if (assignment.paid_amount && assignment.paid_amount > 0) {
      toast.error('Cannot delete assignment with existing payments')
      return
    }

    if (!confirm(`Are you sure you want to delete the ${assignment.fee_structure_name} assignment for ${assignment.student_name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/fees/assignments/${assignment.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Assignment deleted successfully!')
        fetchAssignments() // Refresh the list
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete assignment')
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Failed to delete assignment')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fee Assignments</h2>
          <p className="text-muted-foreground">
            Assign fees to students and track payment status
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSingleAssignModal} onOpenChange={setShowSingleAssignModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Assign Fee to Student</DialogTitle>
                <DialogDescription>
                  Assign a fee structure to an individual student
                </DialogDescription>
              </DialogHeader>
              <SingleAssignmentForm
                feeStructures={feeStructures}
                students={students}
                onSubmit={handleSingleAssignment}
                onCancel={() => setShowSingleAssignModal(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
            <DialogTrigger asChild>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Bulk Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Fee Assignment</DialogTitle>
                <DialogDescription>
                  Assign fees to multiple students at once
                </DialogDescription>
              </DialogHeader>
              <BulkAssignmentForm
                feeStructures={feeStructures}
                students={students}
                onSubmit={handleBulkAssignment}
                onCancel={() => setShowBulkAssignModal(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.payment_status === 'paid').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-red-600">
                  {assignments.filter(a => a.payment_status === 'pending').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${assignments.reduce((sum, a) => sum + a.balance_amount, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students or fees..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFeeType} onValueChange={setFilterFeeType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by fee type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="admission">Admission</SelectItem>
                <SelectItem value="examination">Examination</SelectItem>
                <SelectItem value="library">Library</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Assignments ({filteredAssignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No fee assignments found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowBulkAssignModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Assignment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.student_name}</p>
                        <p className="text-sm text-gray-500">
                          {assignment.student_admission_number} • {assignment.class_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.fee_structure_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {assignment.fee_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {assignment.final_amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {assignment.total_paid.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-orange-600">
                        <DollarSign className="h-4 w-4" />
                        {assignment.balance_amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assignment.payment_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {assignment.payment_status === 'pending' && assignment.balance_amount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordPayment(assignment)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditAssignment(assignment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {(!assignment.paid_amount || assignment.paid_amount === 0) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAssignment(assignment)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Recording Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedAssignment?.student_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <PaymentForm
              assignment={{
                ...selectedAssignment,
                balance_amount: selectedAssignment.balance_amount || 0
              }}
              onSubmit={async (paymentData) => {
                try {
                  const response = await fetch('/api/fees/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      payment: {
                        school_id: user?.school_id,
                        student_id: selectedAssignment.student_id,
                        amount: paymentData.amount,
                        payment_method: paymentData.payment_method,
                        payment_date: paymentData.payment_date,
                        reference_number: paymentData.transaction_reference,
                        notes: paymentData.notes
                      },
                      allocations: [{
                        student_fee_assignment_id: selectedAssignment.id,
                        allocated_amount: paymentData.amount,
                        notes: `Payment for ${selectedAssignment.fee_structure_name}`
                      }]
                    })
                  })

                  if (response.ok) {
                    toast.success('Payment recorded successfully!')
                    setShowPaymentModal(false)
                    setSelectedAssignment(null)
                    fetchAssignments() // Refresh the list
                  } else {
                    const error = await response.json()
                    toast.error(error.error || 'Failed to record payment')
                  }
                } catch (error) {
                  console.error('Error recording payment:', error)
                  toast.error('Failed to record payment')
                }
              }}
              onCancel={() => {
                setShowPaymentModal(false)
                setSelectedAssignment(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update assignment details for {selectedAssignment?.student_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <EditAssignmentForm
              assignment={{
                ...selectedAssignment,
                total_amount: selectedAssignment.total_amount || 0,
                due_date: selectedAssignment.due_date || '',
                notes: selectedAssignment.notes || ''
              }}
              onSubmit={async (updatedData) => {
                try {
                  const response = await fetch(`/api/fees/assignments/${selectedAssignment.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                  })

                  if (response.ok) {
                    toast.success('Assignment updated successfully!')
                    setShowEditModal(false)
                    setSelectedAssignment(null)
                    fetchAssignments() // Refresh the list
                  } else {
                    const error = await response.json()
                    toast.error(error.error || 'Failed to update assignment')
                  }
                } catch (error) {
                  console.error('Error updating assignment:', error)
                  toast.error('Failed to update assignment')
                }
              }}
              onCancel={() => {
                setShowEditModal(false)
                setSelectedAssignment(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Single Assignment Form Component
function SingleAssignmentForm({ 
  feeStructures, 
  students, 
  onSubmit, 
  onCancel 
}: {
  feeStructures: FeeStructure[]
  students: Student[]
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    student_id: '',
    fee_structure_id: '',
    due_date: '',
    academic_year: new Date().getFullYear().toString(),
    discount_percentage: 0,
    discount_amount: 0,
    installments_enabled: false,
    total_installments: 1,
    notes: ''
  })

  const selectedFeeStructure = feeStructures.find(fs => fs.id === formData.fee_structure_id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.student_id || !formData.fee_structure_id || !formData.due_date) {
      toast.error('Please fill in all required fields')
      return
    }

    onSubmit({
      ...formData,
      assigned_amount: selectedFeeStructure?.base_amount || 0
    })
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
                {student.profile.name} ({student.admission_number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fee_structure_id">Fee Structure *</Label>
        <Select value={formData.fee_structure_id} onValueChange={(value) => setFormData({ ...formData, fee_structure_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select fee structure" />
          </SelectTrigger>
          <SelectContent>
            {feeStructures.map(structure => (
              <SelectItem key={structure.id} value={structure.id}>
                {structure.name} (${structure.base_amount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic Year</Label>
          <Input
            id="academic_year"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Assign Fee
        </Button>
      </div>
    </form>
  )
}

// Bulk Assignment Form Component
function BulkAssignmentForm({ 
  feeStructures, 
  students, 
  onSubmit, 
  onCancel 
}: {
  feeStructures: FeeStructure[]
  students: Student[]
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    fee_structure_id: '',
    due_date: '',
    academic_year: new Date().getFullYear().toString(),
    discount_percentage: 0,
    installments_enabled: false,
    total_installments: 1,
    notes: ''
  })
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fee_structure_id || !formData.due_date || selectedStudents.length === 0) {
      toast.error('Please fill in all required fields and select students')
      return
    }

    onSubmit({
      ...formData,
      student_ids: selectedStudents
    })
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const toggleAllStudents = () => {
    setSelectedStudents(prev => 
      prev.length === students.length ? [] : students.map(s => s.id)
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fee_structure_id">Fee Structure *</Label>
        <Select value={formData.fee_structure_id} onValueChange={(value) => setFormData({ ...formData, fee_structure_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select fee structure" />
          </SelectTrigger>
          <SelectContent>
            {feeStructures.map(structure => (
              <SelectItem key={structure.id} value={structure.id}>
                {structure.name} (${structure.base_amount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic Year</Label>
          <Input
            id="academic_year"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Students ({selectedStudents.length} selected)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAllStudents}
          >
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
          {students.map(student => (
            <div key={student.id} className="flex items-center space-x-2">
              <Checkbox
                id={student.id}
                checked={selectedStudents.includes(student.id)}
                onCheckedChange={() => toggleStudent(student.id)}
              />
              <Label htmlFor={student.id} className="flex-1 cursor-pointer">
                {student.profile.name} ({student.admission_number}) - {student.class.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Assign to {selectedStudents.length} Students
        </Button>
      </div>
    </form>
  )
}

// Payment Form Component
function PaymentForm({
  assignment,
  onSubmit,
  onCancel
}: {
  assignment: FeeAssignment
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    amount: assignment.balance_amount || 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (formData.amount > assignment.balance_amount) {
      toast.error('Payment amount cannot exceed balance amount')
      return
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">${assignment.final_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Already Paid:</span>
            <span className="font-medium text-green-600">${assignment.total_paid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
            <span>Balance Due:</span>
            <span className="text-red-600">${assignment.balance_amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Payment Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={assignment.balance_amount}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          placeholder="Enter payment amount"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment Method *</Label>
        <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="online">Online Payment</SelectItem>
            <SelectItem value="card">Card Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_date">Payment Date *</Label>
        <Input
          id="payment_date"
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction_reference">Transaction Reference</Label>
        <Input
          id="transaction_reference"
          value={formData.transaction_reference}
          onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
          placeholder="Receipt number, transaction ID, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes (optional)"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Record Payment
        </Button>
      </div>
    </form>
  )
}

// Edit Assignment Form Component
function EditAssignmentForm({
  assignment,
  onSubmit,
  onCancel
}: {
  assignment: FeeAssignment
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    total_amount: assignment.total_amount || 0,
    due_date: assignment.due_date || '',
    notes: assignment.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.total_amount || formData.total_amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!formData.due_date) {
      toast.error('Please select a due date')
      return
    }

    // Calculate new balance amount
    const newBalanceAmount = formData.total_amount - (assignment.paid_amount || 0)
    const newStatus = newBalanceAmount <= 0 ? 'paid' : newBalanceAmount < formData.total_amount ? 'partial' : 'pending'

    onSubmit({
      total_amount: formData.total_amount,
      balance_amount: newBalanceAmount,
      due_date: formData.due_date,
      notes: formData.notes,
      status: newStatus
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="total_amount">Total Amount *</Label>
        <Input
          id="total_amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.total_amount}
          onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
          placeholder="Enter amount"
          disabled={assignment.paid_amount && assignment.paid_amount > 0}
          required
        />
        {assignment.paid_amount && assignment.paid_amount > 0 && (
          <p className="text-sm text-muted-foreground">
            Amount cannot be changed as payments have been made
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date">Due Date *</Label>
        <Input
          id="due_date"
          type="date"
          value={formData.due_date}
          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          required
        />
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
          Update Assignment
        </Button>
      </div>
    </form>
  )
}
