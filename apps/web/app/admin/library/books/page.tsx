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
  Upload,
  BarChart3
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
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

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
      return <Badge variant="destructive">Unavailable</Badge>
    } else if (book.available_copies <= 2) {
      return <Badge variant="secondary">Limited</Badge>
    } else {
      return <Badge variant="default">Available</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active' },
      withdrawn: { variant: 'secondary' as const, label: 'Withdrawn' },
      lost: { variant: 'destructive' as const, label: 'Lost' },
      damaged: { variant: 'destructive' as const, label: 'Damaged' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
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
              <Upload className="h-4 w-4 mr-2" />
              Import Books
            </Button>
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
                              <Link href={`/admin/library/books/${book.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
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
