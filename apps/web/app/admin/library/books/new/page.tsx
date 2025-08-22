'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

interface BookFormData {
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

export default function NewBookPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [authorInput, setAuthorInput] = useState('')
  const [subjectInput, setSubjectInput] = useState('')
  
  const [formData, setFormData] = useState<BookFormData>({
    isbn: '',
    title: '',
    subtitle: '',
    authors: [],
    publisher: '',
    publication_year: null,
    edition: '',
    language: 'English',
    pages: null,
    category_id: '',
    dewey_decimal: '',
    call_number: '',
    format: 'hardcover',
    dimensions: '',
    weight_grams: null,
    description: '',
    table_of_contents: '',
    subjects: [],
    target_audience: '',
    reading_level: '',
    cover_image_url: '',
    ebook_url: '',
    preview_url: '',
    total_copies: 1,
    acquisition_cost: null,
    supplier: '',
    is_reference_only: false,
    is_digital: false
  })

  useEffect(() => {
    fetchCategories()
  }, [])

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

  const handleInputChange = (field: keyof BookFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addAuthor = () => {
    if (authorInput.trim()) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, authorInput.trim()]
      }))
      setAuthorInput('')
    }
  }

  const removeAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }))
  }

  const addSubject = () => {
    if (subjectInput.trim()) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, subjectInput.trim()]
      }))
      setSubjectInput('')
    }
  }

  const removeSubject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-add author if there's text in the input but not in the array
    if (authorInput.trim() && !formData.authors.includes(authorInput.trim())) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, authorInput.trim()]
      }))
      setAuthorInput('')
    }

    // Check validation after potentially adding the author
    const finalAuthors = authorInput.trim() && !formData.authors.includes(authorInput.trim())
      ? [...formData.authors, authorInput.trim()]
      : formData.authors

    if (!formData.title || finalAuthors.length === 0) {
      toast.error('Title and at least one author are required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/library/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          authors: finalAuthors,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Book added successfully!')
        router.push('/admin/library/books')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add book')
      }
    } catch (error) {
      console.error('Error adding book:', error)
      toast.error('Failed to add book')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Add New Book">
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
            <div>
              <h2 className="text-2xl font-bold">Add New Book</h2>
              <p className="text-muted-foreground">
                Add a new book to your library catalog
              </p>
            </div>
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
                    value={formData.isbn}
                    onChange={(e) => handleInputChange('isbn', e.target.value)}
                    placeholder="978-0-123456-78-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_number">Call Number</Label>
                  <Input
                    id="call_number"
                    value={formData.call_number}
                    onChange={(e) => handleInputChange('call_number', e.target.value)}
                    placeholder="796.332 SMI"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Book title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
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
                    placeholder="Enter author name and press Enter or click +"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
                  />
                  <Button type="button" onClick={addAuthor} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  {formData.authors.length === 0
                    ? "Add at least one author by typing the name and pressing Enter or clicking the + button"
                    : `${formData.authors.length} author(s) added`
                  }
                </p>
                {formData.authors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.authors.map((author, index) => (
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
                    value={formData.publisher}
                    onChange={(e) => handleInputChange('publisher', e.target.value)}
                    placeholder="Publisher name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publication_year">Publication Year</Label>
                  <Input
                    id="publication_year"
                    type="number"
                    value={formData.publication_year || ''}
                    onChange={(e) => handleInputChange('publication_year', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edition">Edition</Label>
                  <Input
                    id="edition"
                    value={formData.edition}
                    onChange={(e) => handleInputChange('edition', e.target.value)}
                    placeholder="1st Edition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pages">Pages</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={formData.pages || ''}
                    onChange={(e) => handleInputChange('pages', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={formData.format} onValueChange={(value) => handleInputChange('format', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardcover">Hardcover</SelectItem>
                      <SelectItem value="paperback">Paperback</SelectItem>
                      <SelectItem value="ebook">E-book</SelectItem>
                      <SelectItem value="audiobook">Audiobook</SelectItem>
                    </SelectContent>
                  </Select>
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Book...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Book
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
