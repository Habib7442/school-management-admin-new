/**
 * Test suite for validation utilities
 * Tests for all validation functions including teacher-specific validations
 */

import {
  validateEmail,
  validatePassword,
  validateName,
  validateAssignmentTitle,
  validateAssignmentType,
  validateGrade,
  validateDueDate,
  validateBehavioralNote,
  validateIncidentType,
  validateSeverityLevel,
  validateLessonPlan,
  validateAttendanceStatus,
  validateFileSize,
  validateFileType,
} from '../lib/utils/validation'

describe('Basic Validation Functions', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'teacher123@school.edu',
        'admin+test@organization.org',
      ]

      validEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        'user@domain..com',
      ]

      invalidEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it('should handle whitespace correctly', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result.isValid).toBe(true)
    })
  })

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex#Password9',
        'Strong$Pass2024',
      ]

      strongPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '',
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'password', // too common
      ]

      weakPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validateName', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John Doe',
        'Mary-Jane Smith',
        "O'Connor",
        'Jean-Pierre',
        'Anna',
      ]

      validNames.forEach(name => {
        const result = validateName(name)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid names', () => {
      const invalidNames = [
        '',
        'A', // too short
        'John123', // contains numbers
        'John@Doe', // contains special characters
        'A'.repeat(51), // too long
      ]

      invalidNames.forEach(name => {
        const result = validateName(name)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })
})

describe('Teacher-Specific Validation Functions', () => {
  describe('validateAssignmentTitle', () => {
    it('should validate correct assignment titles', () => {
      const validTitles = [
        'Math Homework Chapter 5',
        'Science Project: Solar System',
        'English Essay on Shakespeare',
        'History Quiz - World War II',
      ]

      validTitles.forEach(title => {
        const result = validateAssignmentTitle(title)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid assignment titles', () => {
      const invalidTitles = [
        '',
        'AB', // too short
        'A'.repeat(256), // too long
      ]

      invalidTitles.forEach(title => {
        const result = validateAssignmentTitle(title)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAssignmentType', () => {
    it('should validate correct assignment types', () => {
      const validTypes = [
        'homework',
        'project',
        'quiz',
        'test',
        'lab',
        'presentation',
        'essay',
        'research',
      ]

      validTypes.forEach(type => {
        const result = validateAssignmentType(type)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid assignment types', () => {
      const invalidTypes = [
        '',
        'invalid-type',
        'exam', // not in allowed list
        'assignment',
      ]

      invalidTypes.forEach(type => {
        const result = validateAssignmentType(type)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateGrade', () => {
    it('should validate correct grades', () => {
      const validGrades = [
        { grade: 85, maxGrade: 100 },
        { grade: '92.5', maxGrade: 100 },
        { grade: 0, maxGrade: 100 },
        { grade: 100, maxGrade: 100 },
        { grade: 45, maxGrade: 50 },
      ]

      validGrades.forEach(({ grade, maxGrade }) => {
        const result = validateGrade(grade, maxGrade)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid grades', () => {
      const invalidGrades = [
        { grade: -5, maxGrade: 100 }, // negative
        { grade: 105, maxGrade: 100 }, // exceeds max
        { grade: 'invalid', maxGrade: 100 }, // not a number
        { grade: '', maxGrade: 100 }, // empty
      ]

      invalidGrades.forEach(({ grade, maxGrade }) => {
        const result = validateGrade(grade, maxGrade)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateDueDate', () => {
    it('should validate future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]

      const result = validateDueDate(tomorrowString)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]

      const result = validateDueDate(yesterdayString)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '',
        'invalid-date',
        '2024-13-01', // invalid month
        '2024-02-30', // invalid day
      ]

      invalidDates.forEach(date => {
        const result = validateDueDate(date)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateBehavioralNote', () => {
    it('should validate correct behavioral notes', () => {
      const validNotes = [
        {
          title: 'Excellent participation',
          description: 'Student showed great enthusiasm and actively participated in class discussions.',
        },
        {
          title: 'Needs improvement',
          description: 'Student was disruptive during the lesson and needs to work on classroom behavior.',
        },
      ]

      validNotes.forEach(({ title, description }) => {
        const result = validateBehavioralNote(title, description)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject invalid behavioral notes', () => {
      const invalidNotes = [
        { title: '', description: 'Valid description here' }, // empty title
        { title: 'Valid title', description: '' }, // empty description
        { title: 'AB', description: 'Valid description here' }, // title too short
        { title: 'Valid title', description: 'Short' }, // description too short
      ]

      invalidNotes.forEach(({ title, description }) => {
        const result = validateBehavioralNote(title, description)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validateLessonPlan', () => {
    it('should validate correct lesson plans', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]

      const result = validateLessonPlan('Math Lesson: Algebra', tomorrowString, 45)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid lesson plans', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]

      const invalidPlans = [
        { title: '', date: '2024-12-01', duration: 45 }, // empty title
        { title: 'Valid Title', date: yesterdayString, duration: 45 }, // past date
        { title: 'Valid Title', date: '2024-12-01', duration: 5 }, // duration too short
        { title: 'Valid Title', date: '2024-12-01', duration: 400 }, // duration too long
      ]

      invalidPlans.forEach(({ title, date, duration }) => {
        const result = validateLessonPlan(title, date, duration)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validateAttendanceStatus', () => {
    it('should validate correct attendance statuses', () => {
      const validStatuses = ['present', 'absent', 'late', 'excused']

      validStatuses.forEach(status => {
        const result = validateAttendanceStatus(status)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid attendance statuses', () => {
      const invalidStatuses = ['', 'invalid', 'here', 'missing']

      invalidStatuses.forEach(status => {
        const result = validateAttendanceStatus(status)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })
})

describe('File Validation Functions', () => {
  describe('validateFileSize', () => {
    it('should validate files within size limit', () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024, // 10MB (default limit)
      ]

      validSizes.forEach(size => {
        const result = validateFileSize(size)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject files exceeding size limit', () => {
      const invalidSizes = [
        11 * 1024 * 1024, // 11MB (exceeds default 10MB limit)
        50 * 1024 * 1024, // 50MB
      ]

      invalidSizes.forEach(size => {
        const result = validateFileSize(size)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it('should respect custom size limits', () => {
      const result = validateFileSize(3 * 1024 * 1024, 2) // 3MB file, 2MB limit
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validateFileType', () => {
    it('should validate allowed file types', () => {
      const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'png']
      const validFiles = [
        'document.pdf',
        'assignment.doc',
        'report.docx',
        'image.jpg',
        'screenshot.png',
      ]

      validFiles.forEach(fileName => {
        const result = validateFileType(fileName, allowedTypes)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject disallowed file types', () => {
      const allowedTypes = ['pdf', 'doc', 'docx']
      const invalidFiles = [
        'script.exe',
        'virus.bat',
        'image.gif',
        'archive.zip',
        'noextension',
      ]

      invalidFiles.forEach(fileName => {
        const result = validateFileType(fileName, allowedTypes)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })
})
