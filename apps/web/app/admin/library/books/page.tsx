'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  BarChart3,
  Copy,
  Package
} from 'lucide-react'
import Link from 'next/link'

interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  publisher: string
  publication_year: number
  format: string
  total_copies: number
  available_copies: number
  reserved_copies: number
  status: string
  library_categories?: {
    name: string
    color_code: string
  }
  book_copies: Array<{
    id: string
    barcode: string
    status: string
    condition: string
  }>
}

interface Category {
  id: string
  name: string
  code: string
  color_code: string
}

export default function BooksManagement() {
  const { user } = useAuthStore()
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFormat, setSelectedFormat] = useState<string>('all')
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCopiesModal, setShowCopiesModal] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [bookToView, setBookToView] = useState<Book | null>(null)
  const [bookToManageCopies, setBookToManageCopies] = useState<Book | null>(null)
  const [bookCopies, setBookCopies] = useState<any[]>([])
  const [newCopyCount, setNewCopyCount] = useState(1)

  useEffect(() => {
    if (user?.school_id) {
      fetchBooks()
      fetchCategories()
    }
  }, [user?.school_id, searchTerm, selectedCategory, selectedFormat, selectedAvailability, currentPage])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        school_id: user!.school_id,
        user_id: user!.id,
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        category: selectedCategory,
        format: selectedFormat,
        availability: selectedAvailability
      })

      const response = await fetch(`/api/admin/library/books?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error('Failed to fetch books')
      }
    } catch (error) {
      console.error('Error fetching books:', error)
      toast.error('Failed to fetch books')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/admin/library/categories?school_id=${user?.school_id}&user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBookCopies = async (bookId: string) => {
    try {
      const response = await fetch(`/api/admin/library/books/${bookId}/copies?school_id=${user?.school_id}&user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setBookCopies(data.copies || [])
      }
    } catch (error) {
      console.error('Error fetching book copies:', error)
    }
  }

  const handleAddCopies = async () => {
    if (!bookToManageCopies || newCopyCount < 1) return

    try {
      const response = await fetch(`/api/admin/library/books/${bookToManageCopies.id}/copies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: newCopyCount,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success(`${newCopyCount} copies added successfully`)
        fetchBookCopies(bookToManageCopies.id)
        fetchBooks() // Refresh the main list
        setNewCopyCount(1)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add copies')
      }
    } catch (error) {
      console.error('Error adding copies:', error)
      toast.error('Failed to add copies')
    }
  }

  const handleDeleteCopy = async (copyId: string) => {
    if (!bookToManageCopies) return

    try {
      const response = await fetch(`/api/admin/library/books/${bookToManageCopies.id}/copies/${copyId}?school_id=${user?.school_id}&user_id=${user?.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Copy deleted successfully')
        fetchBookCopies(bookToManageCopies.id)
        fetchBooks() // Refresh the main list
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete copy')
      }
    } catch (error) {
      console.error('Error deleting copy:', error)
      toast.error('Failed to delete copy')
    }
  }

  const handleDeleteBook = async () => {
    if (!bookToDelete) return

    try {
      const response = await fetch(`/api/admin/library/books/${bookToDelete.id}?school_id=${user?.school_id}&user_id=${user?.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Book deleted successfully')
        fetchBooks()
        setShowDeleteModal(false)
        setBookToDelete(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete book')
      }
    } catch (error) {
      console.error('Error deleting book:', error)
      toast.error('Failed to delete book')
    }
  }

  const getAvailabilityBadge = (book: Book) => {
    if (book.available_copies === 0) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Unavailable</Badge>
    } else if (book.available_copies <= 2) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Limited</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Available</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { className: 'bg-blue-100 text-blue-800 hover:bg-blue-200', label: 'Active' },
      withdrawn: { className: 'bg-gray-100 text-gray-800 hover:bg-gray-200', label: 'Withdrawn' },
      lost: { className: 'bg-red-100 text-red-800 hover:bg-red-200', label: 'Lost' },
      damaged: { className: 'bg-orange-100 text-orange-800 hover:bg-orange-200', label: 'Damaged' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge className={config.className}>{config.label}</Badge>
  }

  return (
    <AdminLayout title="Library Books Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Books Catalog</h2>
            <p className="text-muted-foreground">
              Manage your library's book collection
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/admin/library/books/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Book
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by title, author, ISBN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="hardcover">Hardcover</SelectItem>
                  <SelectItem value="paperback">Paperback</SelectItem>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Books</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Books Table */}
        <Card>
          <CardHeader>
            <CardTitle>Books ({books.length})</CardTitle>
            <CardDescription>
              Complete list of books in your library catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No books found</p>
                <Link href="/admin/library/books/new">
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Book
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title & Author</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Copies</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {books.map((book) => (
                        <TableRow key={book.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{book.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {book.authors.join(', ')}
                              </p>
                              {book.isbn && (
                                <p className="text-xs text-muted-foreground">
                                  ISBN: {book.isbn}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {book.library_categories && (
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: book.library_categories.color_code,
                                  color: book.library_categories.color_code 
                                }}
                              >
                                {book.library_categories.name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {book.format}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Total: {book.total_copies}</div>
                              <div>Available: {book.available_copies}</div>
                              {book.reserved_copies > 0 && (
                                <div>Reserved: {book.reserved_copies}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getAvailabilityBadge(book)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(book.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBookToView(book)
                                  setShowViewModal(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBookToManageCopies(book)
                                  setShowCopiesModal(true)
                                  fetchBookCopies(book.id)
                                }}
                                title="Manage Copies"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                              <Link href={`/admin/library/books/${book.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBookToDelete(book)
                                  setShowDeleteModal(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* View Book Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bookToView?.title}</DialogTitle>
              <DialogDescription>
                Book details and information
              </DialogDescription>
            </DialogHeader>
            {bookToView && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Authors</Label>
                    <p className="text-sm">{bookToView.authors?.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">ISBN</Label>
                    <p className="text-sm">{bookToView.isbn || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Publisher</Label>
                    <p className="text-sm">{bookToView.publisher || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Publication Year</Label>
                    <p className="text-sm">{bookToView.publication_year || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Format</Label>
                    <p className="text-sm capitalize">{bookToView.format || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Language</Label>
                    <p className="text-sm">{bookToView.language || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Total Copies</Label>
                    <p className="text-sm">{bookToView.total_copies}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Available Copies</Label>
                    <p className="text-sm">{bookToView.available_copies}</p>
                  </div>
                </div>
                {bookToView.description && (
                  <div>
                    <Label className="font-medium">Description</Label>
                    <p className="text-sm mt-1">{bookToView.description}</p>
                  </div>
                )}
                {bookToView.subjects && bookToView.subjects.length > 0 && (
                  <div>
                    <Label className="font-medium">Subjects</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bookToView.subjects.map((subject, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>
                    Close
                  </Button>
                  <Link href={`/admin/library/books/${bookToView.id}/edit`}>
                    <Button onClick={() => setShowViewModal(false)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Book
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Copies Modal */}
        <Dialog open={showCopiesModal} onOpenChange={setShowCopiesModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Copies - {bookToManageCopies?.title}</DialogTitle>
              <DialogDescription>
                Add or remove book copies
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Add Copies Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Add New Copies</h3>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="copyCount">Number of copies to add:</Label>
                  <Input
                    id="copyCount"
                    type="number"
                    min="1"
                    max="50"
                    value={newCopyCount}
                    onChange={(e) => setNewCopyCount(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Button onClick={handleAddCopies}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Copies
                  </Button>
                </div>
              </div>

              {/* Existing Copies List */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Existing Copies ({bookCopies.length})</h3>
                {bookCopies.length === 0 ? (
                  <p className="text-muted-foreground">No copies found</p>
                ) : (
                  <div className="space-y-2">
                    {bookCopies.map((copy) => (
                      <div key={copy.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-4">
                          <span className="font-mono text-sm">{copy.barcode}</span>
                          <Badge
                            className={
                              copy.status === 'available'
                                ? 'bg-green-100 text-green-800'
                                : copy.status === 'borrowed'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {copy.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Condition: {copy.condition}
                          </span>
                          {copy.location && (
                            <span className="text-sm text-muted-foreground">
                              Location: {copy.location}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCopy(copy.id)}
                          disabled={copy.status === 'borrowed'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCopiesModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Book</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{bookToDelete?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBook}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
