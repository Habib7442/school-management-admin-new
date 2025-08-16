'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  Calendar, 
  Users,
  Search,
  Filter
} from 'lucide-react'

interface FeeStructure {
  id: string
  name: string
  description?: string
  fee_type: string
  base_amount: number
  currency: string
  class_id?: string
  grade_level?: number
  academic_year: string
  due_date?: string
  frequency: string
  installments_allowed: boolean
  max_installments: number
  late_fee_enabled: boolean
  late_fee_amount: number
  late_fee_percentage: number
  grace_period_days: number
  is_active: boolean
  is_mandatory: boolean
  auto_assign_new_students: boolean
  assignment_count: number
  class_name?: string
  created_by_name: string
  created_at: string
}

const FEE_TYPES = [
  'tuition', 'admission', 'examination', 'library', 'laboratory', 
  'transport', 'hostel', 'sports', 'activity', 'development', 
  'security_deposit', 'caution_money', 'miscellaneous'
]

const FREQUENCIES = ['annual', 'semester', 'quarterly', 'monthly', 'one_time']

export default function FeeStructuresManagement() {
  const { user } = useAuthStore()
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)

  useEffect(() => {
    fetchFeeStructures()
  }, [user])

  const fetchFeeStructures = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/fees/structures?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (result.success) {
        setFeeStructures(result.data.fee_structures)
      } else {
        toast.error('Failed to load fee structures')
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error)
      toast.error('Failed to load fee structures')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStructure = async (structureData: Partial<FeeStructure>) => {
    if (!user?.school_id) return

    try {
      const response = await fetch('/api/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...structureData,
          school_id: user.school_id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Fee structure created successfully')
        setShowCreateModal(false)
        fetchFeeStructures()
      } else {
        toast.error(result.error || 'Failed to create fee structure')
      }
    } catch (error) {
      console.error('Error creating fee structure:', error)
      toast.error('Failed to create fee structure')
    }
  }

  const handleUpdateStructure = async (id: string, updateData: Partial<FeeStructure>) => {
    try {
      const response = await fetch(`/api/fees/structures?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Fee structure updated successfully')
        setEditingStructure(null)
        fetchFeeStructures()
      } else {
        toast.error(result.error || 'Failed to update fee structure')
      }
    } catch (error) {
      console.error('Error updating fee structure:', error)
      toast.error('Failed to update fee structure')
    }
  }

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return

    try {
      const response = await fetch(`/api/fees/structures?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Fee structure deleted successfully')
        fetchFeeStructures()
      } else {
        toast.error(result.error || 'Failed to delete fee structure')
      }
    } catch (error) {
      console.error('Error deleting fee structure:', error)
      toast.error('Failed to delete fee structure')
    }
  }

  // Filter fee structures based on search and filters
  const filteredStructures = feeStructures.filter(structure => {
    const matchesSearch = structure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         structure.fee_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || structure.fee_type === filterType
    const matchesActive = filterActive === 'all' || structure.is_active.toString() === filterActive

    return matchesSearch && matchesType && matchesActive
  })

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
          <h2 className="text-2xl font-bold">Fee Structures</h2>
          <p className="text-muted-foreground">
            Manage fee types, amounts, and payment schedules
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Fee Structure</DialogTitle>
              <DialogDescription>
                Set up a new fee type with amounts and payment terms
              </DialogDescription>
            </DialogHeader>
            <FeeStructureForm
              onSubmit={handleCreateStructure}
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
                  placeholder="Search fee structures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {FEE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structures ({filteredStructures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStructures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No fee structures found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Fee Structure
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStructures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{structure.name}</p>
                        {structure.class_name && (
                          <p className="text-sm text-gray-500">{structure.class_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {structure.fee_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {structure.base_amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {structure.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {structure.assignment_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={structure.is_active ? "default" : "secondary"}>
                        {structure.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStructure(structure)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStructure(structure.id)}
                          disabled={structure.assignment_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit Modal */}
      {editingStructure && (
        <Dialog open={!!editingStructure} onOpenChange={() => setEditingStructure(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Fee Structure</DialogTitle>
              <DialogDescription>
                Update fee structure details and settings
              </DialogDescription>
            </DialogHeader>
            <FeeStructureForm
              initialData={editingStructure}
              onSubmit={(data) => handleUpdateStructure(editingStructure.id, data)}
              onCancel={() => setEditingStructure(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Fee Structure Form Component
function FeeStructureForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: {
  initialData?: Partial<FeeStructure>
  onSubmit: (data: Partial<FeeStructure>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    fee_type: initialData?.fee_type || '',
    base_amount: initialData?.base_amount || 0,
    academic_year: initialData?.academic_year || new Date().getFullYear().toString(),
    due_date: initialData?.due_date || '',
    frequency: initialData?.frequency || 'annual',
    installments_allowed: initialData?.installments_allowed || false,
    max_installments: initialData?.max_installments || 1,
    late_fee_enabled: initialData?.late_fee_enabled || false,
    late_fee_amount: initialData?.late_fee_amount || 0,
    late_fee_percentage: initialData?.late_fee_percentage || 0,
    grace_period_days: initialData?.grace_period_days || 0,
    is_active: initialData?.is_active !== false,
    is_mandatory: initialData?.is_mandatory !== false,
    auto_assign_new_students: initialData?.auto_assign_new_students || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.fee_type || !formData.base_amount) {
      toast.error('Please fill in all required fields')
      return
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Grade 1 Tuition Fee"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee_type">Fee Type *</Label>
          <Select value={formData.fee_type} onValueChange={(value) => setFormData({ ...formData, fee_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select fee type" />
            </SelectTrigger>
            <SelectContent>
              {FEE_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description of the fee"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_amount">Amount *</Label>
          <Input
            id="base_amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.base_amount}
            onChange={(e) => setFormData({ ...formData, base_amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic Year *</Label>
          <Input
            id="academic_year"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
            placeholder="2024-2025"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(freq => (
                <SelectItem key={freq} value={freq}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_mandatory"
            checked={formData.is_mandatory}
            onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })}
          />
          <Label htmlFor="is_mandatory">Mandatory</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="installments_allowed"
            checked={formData.installments_allowed}
            onCheckedChange={(checked) => setFormData({ ...formData, installments_allowed: checked })}
          />
          <Label htmlFor="installments_allowed">Allow Installments</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="late_fee_enabled"
            checked={formData.late_fee_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, late_fee_enabled: checked })}
          />
          <Label htmlFor="late_fee_enabled">Enable Late Fees</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update' : 'Create'} Fee Structure
        </Button>
      </div>
    </form>
  )
}
