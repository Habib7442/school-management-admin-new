'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  code: string
}

interface Book {
  id: string
  isbn: string
  title: string
  subtitle: string
  authors: string[]
  publisher: string
  publication_year: number | null
  edition: string
  language: string
  pages: number | null
  category_id: string
  dewey_decimal: string
  call_number: string
  format: string
  dimensions: string
  weight_grams: number | null
  description: string
  table_of_contents: string
  subjects: string[]
  target_audience: string
  reading_level: string
  cover_image_url: string
  ebook_url: string
  preview_url: string
  total_copies: number
  acquisition_cost: number | null
  supplier: string
  is_reference_only: boolean
  is_digital: boolean
}

export default function EditBookPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string
  
  const [book, setBook] = useState<Book | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authorInput, setAuthorInput] = useState('')
  const [subjectInput, setSubjectInput] = useState('')

  useEffect(() => {
    if (bookId) {
      fetchBook()
      fetchCategories()
    }
  }, [bookId])

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/admin/library/books/${bookId}?school_id=${user?.school_id}&user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setBook(data.book)
      } else {
        toast.error('Failed to fetch book details')
        router.push('/admin/library/books')
      }
    } catch (error) {
      console.error('Error fetching book:', error)
      toast.error('Failed to fetch book details')
      router.push('/admin/library/books')
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

  const handleInputChange = (field: keyof Book, value: any) => {
    setBook(prev => prev ? ({
      ...prev,
      [field]: value
    }) : null)
  }

  const addAuthor = () => {
    if (authorInput.trim() && book) {
      setBook(prev => prev ? ({
        ...prev,
        authors: [...(prev.authors || []), authorInput.trim()]
      }) : null)
      setAuthorInput('')
    }
  }

  const removeAuthor = (index: number) => {
    if (book) {
      setBook(prev => prev ? ({
        ...prev,
        authors: (prev.authors || []).filter((_, i) => i !== index)
      }) : null)
    }
  }

  const addSubject = () => {
    if (subjectInput.trim() && book) {
      setBook(prev => prev ? ({
        ...prev,
        subjects: [...(prev.subjects || []), subjectInput.trim()]
      }) : null)
      setSubjectInput('')
    }
  }

  const removeSubject = (index: number) => {
    if (book) {
      setBook(prev => prev ? ({
        ...prev,
        subjects: (prev.subjects || []).filter((_, i) => i !== index)
      }) : null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!book || !book.title || !book.authors || book.authors.length === 0) {
      toast.error('Title and at least one author are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/library/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...book,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Book updated successfully!')
        router.push('/admin/library/books')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update book')
      }
    } catch (error) {
      console.error('Error updating book:', error)
      toast.error('Failed to update book')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Edit Book">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!book) {
    return (
      <AdminLayout title="Edit Book">
        <div className="text-center py-8">
          <p className="text-gray-500">Book not found</p>
          <Link href="/admin/library/books">
            <Button variant="outline" className="mt-4">
              Back to Books
            </Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Edit Book">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/library/books">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Books
              </Button>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential book details and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    value={book.isbn || ''}
                    onChange={(e) => handleInputChange('isbn', e.target.value)}
                    placeholder="978-0-123456-78-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_number">Call Number</Label>
                  <Input
                    id="call_number"
                    value={book.call_number || ''}
                    onChange={(e) => handleInputChange('call_number', e.target.value)}
                    placeholder="796.332 SMI"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={book.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Book title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={book.subtitle || ''}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  placeholder="Book subtitle"
                />
              </div>

              <div className="space-y-2">
                <Label>Authors *</Label>
                <div className="flex space-x-2">
                  <Input
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    placeholder="Author name"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
                  />
                  <Button type="button" onClick={addAuthor} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {book.authors && book.authors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {book.authors.map((author, index) => (
                      <div key={index} className="bg-secondary px-2 py-1 rounded-md text-sm flex items-center space-x-1">
                        <span>{author}</span>
                        <button
                          type="button"
                          onClick={() => removeAuthor(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Publication Details */}
          <Card>
            <CardHeader>
              <CardTitle>Publication Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={book.publisher || ''}
                    onChange={(e) => handleInputChange('publisher', e.target.value)}
                    placeholder="Publisher name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publication_year">Publication Year</Label>
                  <Input
                    id="publication_year"
                    type="number"
                    value={book.publication_year || ''}
                    onChange={(e) => handleInputChange('publication_year', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edition">Edition</Label>
                  <Input
                    id="edition"
                    value={book.edition || ''}
                    onChange={(e) => handleInputChange('edition', e.target.value)}
                    placeholder="1st Edition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={book.language || ''}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    placeholder="English"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pages">Pages</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={book.pages || ''}
                    onChange={(e) => handleInputChange('pages', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Number of pages"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={book.format || ''} onValueChange={(value) => handleInputChange('format', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardcover">Hardcover</SelectItem>
                      <SelectItem value="paperback">Paperback</SelectItem>
                      <SelectItem value="ebook">E-book</SelectItem>
                      <SelectItem value="audiobook">Audiobook</SelectItem>
                      <SelectItem value="magazine">Magazine</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="dvd">DVD</SelectItem>
                      <SelectItem value="cd">CD</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Library Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Library Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select value={book.category_id || ''} onValueChange={(value) => handleInputChange('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dewey_decimal">Dewey Decimal</Label>
                  <Input
                    id="dewey_decimal"
                    value={book.dewey_decimal || ''}
                    onChange={(e) => handleInputChange('dewey_decimal', e.target.value)}
                    placeholder="796.332"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_number">Call Number</Label>
                  <Input
                    id="call_number"
                    value={book.call_number || ''}
                    onChange={(e) => handleInputChange('call_number', e.target.value)}
                    placeholder="796.332 SMI"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={book.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Book description or summary"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={book.dimensions || ''}
                    onChange={(e) => handleInputChange('dimensions', e.target.value)}
                    placeholder="e.g., 8.5 x 11 inches"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_grams">Weight (grams)</Label>
                  <Input
                    id="weight_grams"
                    type="number"
                    value={book.weight_grams || ''}
                    onChange={(e) => handleInputChange('weight_grams', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/admin/library/books">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Book...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Book
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
