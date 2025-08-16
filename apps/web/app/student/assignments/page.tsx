'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function StudentAssignments() {
  // Mock data - will be replaced with real data from database
  const assignments = [
    {
      id: '1',
      title: 'Math Homework - Chapter 3',
      subject: 'Mathematics',
      teacher: 'Mr. Smith',
      dueDate: '2025-01-20',
      status: 'pending',
      description: 'Complete exercises 1-15 from Chapter 3: Algebraic Expressions',
      submittedAt: null
    },
    {
      id: '2',
      title: 'Science Lab Report',
      subject: 'Chemistry',
      teacher: 'Ms. Johnson',
      dueDate: '2025-01-18',
      status: 'submitted',
      description: 'Write a detailed report on the chemical reactions experiment',
      submittedAt: '2025-01-17'
    },
    {
      id: '3',
      title: 'English Essay',
      subject: 'English Literature',
      teacher: 'Mrs. Brown',
      dueDate: '2025-01-25',
      status: 'pending',
      description: 'Write a 500-word essay on "The Impact of Technology on Modern Society"',
      submittedAt: null
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>
      case 'graded':
        return <Badge variant="secondary">Graded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  const pendingAssignments = assignments.filter(a => a.status === 'pending')
  const submittedAssignments = assignments.filter(a => a.status === 'submitted')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-500">Track and submit your homework and projects</p>
        </div>
        <div className="flex space-x-2">
          <Badge variant="outline">
            {pendingAssignments.length} Pending
          </Badge>
          <Badge variant="outline">
            {submittedAssignments.length} Submitted
          </Badge>
        </div>
      </div>

      {/* Pending Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Pending Assignments</CardTitle>
          <CardDescription>Assignments that need to be completed</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAssignments.length > 0 ? (
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <div key={assignment.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900">{assignment.title}</h3>
                      <p className="text-sm text-red-700 mt-1">{assignment.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-red-600">
                        <span>Subject: {assignment.subject}</span>
                        <span>Teacher: {assignment.teacher}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(assignment.status)}
                      <div className="text-sm text-red-600 mt-1">
                        {getDaysUntilDue(assignment.dueDate)}
                      </div>
                      <div className="text-xs text-red-500">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm">
                      Submit Assignment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p>No pending assignments!</p>
              <p className="text-sm">Great job staying on top of your work.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Submitted Assignments</CardTitle>
          <CardDescription>Assignments you have completed</CardDescription>
        </CardHeader>
        <CardContent>
          {submittedAssignments.length > 0 ? (
            <div className="space-y-4">
              {submittedAssignments.map((assignment) => (
                <div key={assignment.id} className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-green-900">{assignment.title}</h3>
                      <p className="text-sm text-green-700 mt-1">{assignment.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-green-600">
                        <span>Subject: {assignment.subject}</span>
                        <span>Teacher: {assignment.teacher}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(assignment.status)}
                      <div className="text-sm text-green-600 mt-1">
                        Submitted: {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-xs text-green-500">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">
                      View Submission
                    </Button>
                    <Button size="sm" variant="outline">
                      View Feedback
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>No submitted assignments yet</p>
              <p className="text-sm">Complete and submit your assignments to see them here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Submission Coming Soon</h3>
          <p className="text-gray-500 mb-4">
            Full assignment submission functionality with file uploads, due date reminders, and grade tracking is currently under development.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline">File Upload</Badge>
            <Badge variant="outline">Due Date Reminders</Badge>
            <Badge variant="outline">Grade Tracking</Badge>
            <Badge variant="outline">Teacher Feedback</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
