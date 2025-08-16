'use client'

import { StudentGuard } from '@/components/auth/AuthGuard'
import StudentLayout from '@/components/student/StudentLayout'

interface StudentLayoutProps {
  children: React.ReactNode
}

export default function StudentDashboardLayout({ children }: StudentLayoutProps) {
  return (
    <StudentGuard>
      <StudentLayout>
        {children}
      </StudentLayout>
    </StudentGuard>
  )
}
