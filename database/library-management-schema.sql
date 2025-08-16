-- =============================================
-- LIBRARY MANAGEMENT SYSTEM SCHEMA
-- =============================================
-- Comprehensive library management system for school management application
-- Based on modern library systems like Koha and Evergreen

-- =============================================
-- LIBRARY CATEGORIES TABLE
-- =============================================
-- Book classification system (Dewey Decimal, custom categories)
CREATE TABLE IF NOT EXISTS library_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- e.g., "000", "100" for Dewey Decimal
    description TEXT,
    parent_category_id UUID REFERENCES library_categories(id) ON DELETE SET NULL,
    color_code VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, code),
    UNIQUE(school_id, name)
);

-- =============================================
-- BOOKS TABLE
-- =============================================
-- Master book catalog with bibliographic information
CREATE TABLE IF NOT EXISTS books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    
    -- Bibliographic Information
    isbn VARCHAR(17), -- ISBN-13 format with hyphens
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    authors TEXT[] NOT NULL, -- Array of author names
    publisher VARCHAR(255),
    publication_year INTEGER,
    edition VARCHAR(100),
    language VARCHAR(50) DEFAULT 'English',
    pages INTEGER,
    
    -- Classification
    category_id UUID REFERENCES library_categories(id) ON DELETE SET NULL,
    dewey_decimal VARCHAR(20), -- e.g., "796.332"
    call_number VARCHAR(100), -- Library-specific call number
    
    -- Physical Description
    format VARCHAR(50) DEFAULT 'hardcover', -- hardcover, paperback, ebook, audiobook
    dimensions VARCHAR(100), -- e.g., "24 x 16 cm"
    weight_grams INTEGER,
    
    -- Content Information
    description TEXT,
    table_of_contents TEXT,
    subjects TEXT[], -- Array of subject keywords
    target_audience VARCHAR(100), -- e.g., "Grade 1-3", "Adults"
    reading_level VARCHAR(50), -- e.g., "Beginner", "Intermediate"
    
    -- Digital Resources
    cover_image_url TEXT,
    ebook_url TEXT, -- For digital books
    preview_url TEXT, -- Preview/sample pages
    
    -- Inventory Management
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    reserved_copies INTEGER DEFAULT 0,
    damaged_copies INTEGER DEFAULT 0,
    lost_copies INTEGER DEFAULT 0,
    
    -- Acquisition Information
    acquisition_date DATE DEFAULT CURRENT_DATE,
    acquisition_cost DECIMAL(10,2),
    supplier VARCHAR(255),
    
    -- Status and Metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'lost', 'damaged')),
    is_reference_only BOOLEAN DEFAULT false, -- Cannot be borrowed
    is_digital BOOLEAN DEFAULT false,
    popularity_score INTEGER DEFAULT 0, -- For recommendations
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (total_copies >= 0),
    CHECK (available_copies >= 0),
    CHECK (available_copies <= total_copies),
    CHECK (publication_year > 1000 AND publication_year <= EXTRACT(YEAR FROM NOW()) + 5)
);

-- =============================================
-- BOOK COPIES TABLE
-- =============================================
-- Individual copy tracking with barcodes
CREATE TABLE IF NOT EXISTS book_copies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    
    -- Copy Identification
    barcode VARCHAR(50) UNIQUE NOT NULL, -- Unique barcode for scanning
    copy_number INTEGER NOT NULL, -- Copy 1, 2, 3, etc.
    accession_number VARCHAR(100), -- Library accession number
    
    -- Physical Condition
    condition VARCHAR(20) DEFAULT 'excellent' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    location VARCHAR(255), -- Shelf location, e.g., "A-1-3" (Aisle-Shelf-Position)
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved', 'maintenance', 'lost', 'withdrawn')),
    
    -- Acquisition Details
    acquisition_date DATE DEFAULT CURRENT_DATE,
    acquisition_cost DECIMAL(10,2),
    vendor VARCHAR(255),
    
    -- Maintenance History
    last_maintenance_date DATE,
    maintenance_notes TEXT,
    
    -- Circulation Statistics
    total_checkouts INTEGER DEFAULT 0,
    last_checkout_date DATE,
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book_id, copy_number)
);

-- =============================================
-- LIBRARY MEMBERS TABLE
-- =============================================
-- Extended member information for library access
CREATE TABLE IF NOT EXISTS library_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    
    -- Member Identification
    library_card_number VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL, -- For card scanning
    
    -- Membership Details
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('student', 'teacher', 'staff', 'guest')),
    membership_start_date DATE DEFAULT CURRENT_DATE,
    membership_end_date DATE,
    
    -- Borrowing Privileges
    max_books_allowed INTEGER DEFAULT 3, -- Based on member type
    max_days_allowed INTEGER DEFAULT 14, -- Default borrowing period
    can_reserve BOOLEAN DEFAULT true,
    can_renew BOOLEAN DEFAULT true,
    max_renewals INTEGER DEFAULT 2,
    
    -- Contact Preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    preferred_language VARCHAR(10) DEFAULT 'en',
    
    -- Status and Restrictions
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'blocked')),
    suspension_reason TEXT,
    suspension_until DATE,
    
    -- Statistics
    total_books_borrowed INTEGER DEFAULT 0,
    total_fines_paid DECIMAL(10,2) DEFAULT 0,
    current_fines DECIMAL(10,2) DEFAULT 0,
    
    -- Emergency Contact (for students)
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BORROWING TRANSACTIONS TABLE
-- =============================================
-- Complete borrowing and return history
CREATE TABLE IF NOT EXISTS borrowing_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction Parties
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE NOT NULL,
    book_copy_id UUID REFERENCES book_copies(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('checkout', 'return', 'renewal', 'lost', 'damaged')),
    
    -- Dates and Times
    checkout_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    
    -- Renewal Information
    renewal_count INTEGER DEFAULT 0,
    max_renewals_allowed INTEGER DEFAULT 2,
    
    -- Staff Information
    checkout_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Librarian who processed checkout
    return_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Librarian who processed return
    
    -- Condition and Notes
    checkout_condition VARCHAR(20) DEFAULT 'good',
    return_condition VARCHAR(20),
    notes TEXT,
    
    -- Fine Information
    fine_amount DECIMAL(10,2) DEFAULT 0,
    fine_paid BOOLEAN DEFAULT false,
    fine_waived BOOLEAN DEFAULT false,
    fine_waived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    fine_waived_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'lost', 'damaged')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (return_date IS NULL OR return_date >= checkout_date),
    CHECK (due_date >= DATE(checkout_date))
);

-- =============================================
-- RESERVATIONS TABLE
-- =============================================
-- Book reservation queue management
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,

    -- Reservation Details
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,

    -- Queue Management
    queue_position INTEGER NOT NULL,
    priority_level INTEGER DEFAULT 1, -- 1=normal, 2=high, 3=urgent

    -- Dates
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date DATE, -- When reservation expires if not fulfilled
    notification_date DATE, -- When member was notified book is available
    pickup_deadline DATE, -- Deadline to pick up reserved book

    -- Status Tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'fulfilled', 'expired', 'cancelled')),

    -- Fulfillment Details
    fulfilled_date TIMESTAMP WITH TIME ZONE,
    fulfilled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    book_copy_id UUID REFERENCES book_copies(id) ON DELETE SET NULL, -- Specific copy assigned

    -- Cancellation Details
    cancelled_date TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cancellation_reason TEXT,

    -- Notification Tracking
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    notification_attempts INTEGER DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate active reservations
    UNIQUE(member_id, book_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================
-- FINES TABLE
-- =============================================
-- Fine management and payment tracking
CREATE TABLE IF NOT EXISTS fines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,

    -- Fine Details
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES borrowing_transactions(id) ON DELETE SET NULL,

    -- Fine Information
    fine_type VARCHAR(30) NOT NULL CHECK (fine_type IN ('overdue', 'lost_book', 'damaged_book', 'late_return', 'processing_fee')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT,

    -- Calculation Details
    days_overdue INTEGER DEFAULT 0,
    daily_fine_rate DECIMAL(10,2) DEFAULT 0,
    base_fine DECIMAL(10,2) DEFAULT 0,

    -- Dates
    fine_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Payment Information
    amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(20), -- cash, card, online, waived
    payment_reference VARCHAR(100), -- Transaction ID, receipt number

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'waived', 'cancelled')),

    -- Waiver Information
    waived_amount DECIMAL(10,2) DEFAULT 0 CHECK (waived_amount >= 0),
    waived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    waived_date TIMESTAMP WITH TIME ZONE,
    waiver_reason TEXT,

    -- Staff Information
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (amount_paid + waived_amount <= amount)
);

-- =============================================
-- LIBRARY SETTINGS TABLE
-- =============================================
-- Configurable library policies and settings
CREATE TABLE IF NOT EXISTS library_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Borrowing Policies
    default_loan_period_days INTEGER DEFAULT 14,
    max_renewals INTEGER DEFAULT 2,
    renewal_period_days INTEGER DEFAULT 14,

    -- Member Limits (by type)
    student_max_books INTEGER DEFAULT 3,
    teacher_max_books INTEGER DEFAULT 10,
    staff_max_books INTEGER DEFAULT 5,
    guest_max_books INTEGER DEFAULT 2,

    -- Fine Policies
    daily_overdue_fine DECIMAL(10,2) DEFAULT 1.00,
    max_fine_amount DECIMAL(10,2) DEFAULT 100.00,
    lost_book_fine_multiplier DECIMAL(3,2) DEFAULT 1.5, -- 1.5x book cost
    damaged_book_fine_percentage INTEGER DEFAULT 50, -- 50% of book cost

    -- Reservation Policies
    max_reservations_per_member INTEGER DEFAULT 5,
    reservation_expiry_days INTEGER DEFAULT 7,
    pickup_deadline_days INTEGER DEFAULT 3,

    -- Notification Settings
    overdue_notice_days INTEGER DEFAULT 1, -- Send notice after 1 day overdue
    reminder_days_before_due INTEGER DEFAULT 2, -- Remind 2 days before due
    max_notification_attempts INTEGER DEFAULT 3,

    -- Library Hours
    opening_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "13:00"}, "sunday": {"closed": true}}',

    -- System Settings
    barcode_prefix VARCHAR(10) DEFAULT 'LIB',
    auto_generate_barcodes BOOLEAN DEFAULT true,
    require_member_photo BOOLEAN DEFAULT false,
    allow_guest_membership BOOLEAN DEFAULT true,

    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Books table indexes
CREATE INDEX idx_books_school_id ON books(school_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_authors ON books USING gin(authors);
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_subjects ON books USING gin(subjects);

-- Book copies indexes
CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX idx_book_copies_barcode ON book_copies(barcode);
CREATE INDEX idx_book_copies_status ON book_copies(status);
CREATE INDEX idx_book_copies_location ON book_copies(location);

-- Library members indexes
CREATE INDEX idx_library_members_profile_id ON library_members(profile_id);
CREATE INDEX idx_library_members_card_number ON library_members(library_card_number);
CREATE INDEX idx_library_members_barcode ON library_members(barcode);
CREATE INDEX idx_library_members_status ON library_members(status);
CREATE INDEX idx_library_members_member_type ON library_members(member_type);

-- Borrowing transactions indexes
CREATE INDEX idx_borrowing_transactions_member_id ON borrowing_transactions(member_id);
CREATE INDEX idx_borrowing_transactions_book_copy_id ON borrowing_transactions(book_copy_id);
CREATE INDEX idx_borrowing_transactions_status ON borrowing_transactions(status);
CREATE INDEX idx_borrowing_transactions_due_date ON borrowing_transactions(due_date);
CREATE INDEX idx_borrowing_transactions_checkout_date ON borrowing_transactions(checkout_date);

-- Reservations indexes
CREATE INDEX idx_reservations_member_id ON reservations(member_id);
CREATE INDEX idx_reservations_book_id ON reservations(book_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_queue_position ON reservations(queue_position);

-- Fines indexes
CREATE INDEX idx_fines_member_id ON fines(member_id);
CREATE INDEX idx_fines_status ON fines(status);
CREATE INDEX idx_fines_fine_date ON fines(fine_date);
CREATE INDEX idx_fines_due_date ON fines(due_date);
