-- =============================================
-- FEE MANAGEMENT SYSTEM DATABASE SCHEMA
-- =============================================
-- Comprehensive fee management system for schools
-- Includes fee structures, payments, invoices, and financial tracking

-- Create custom types for fee management
CREATE TYPE fee_type AS ENUM (
    'tuition', 'admission', 'examination', 'library', 'laboratory', 
    'transport', 'hostel', 'sports', 'activity', 'development', 
    'security_deposit', 'caution_money', 'miscellaneous'
);

CREATE TYPE payment_method AS ENUM (
    'cash', 'cheque', 'bank_transfer', 'online', 'card', 'upi', 'wallet'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'
);

CREATE TYPE invoice_status AS ENUM (
    'draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'
);

CREATE TYPE transaction_type AS ENUM (
    'payment', 'refund', 'adjustment', 'late_fee', 'discount', 'waiver'
);

-- =============================================
-- FEE STRUCTURES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic information
    name VARCHAR(255) NOT NULL, -- e.g., "Grade 1 Annual Fees", "Admission Fees 2024"
    description TEXT,
    fee_type fee_type NOT NULL,
    
    -- Amount and calculation
    base_amount DECIMAL(10,2) NOT NULL CHECK (base_amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Applicability
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL, -- NULL means applies to all classes
    grade_level INTEGER, -- Specific grade level (1-12)
    academic_year VARCHAR(20), -- e.g., "2024-2025"
    
    -- Timing and frequency
    due_date DATE,
    frequency VARCHAR(20) DEFAULT 'annual' CHECK (frequency IN ('annual', 'semester', 'quarterly', 'monthly', 'one_time')),
    installments_allowed BOOLEAN DEFAULT false,
    max_installments INTEGER DEFAULT 1,
    
    -- Late fee configuration
    late_fee_enabled BOOLEAN DEFAULT true,
    late_fee_amount DECIMAL(10,2) DEFAULT 0,
    late_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Percentage of base amount
    grace_period_days INTEGER DEFAULT 0,
    
    -- Discount and concession
    discount_enabled BOOLEAN DEFAULT false,
    early_payment_discount_percentage DECIMAL(5,2) DEFAULT 0,
    early_payment_deadline DATE,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT true,
    auto_assign_new_students BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(school_id, name, academic_year),
    CHECK (max_installments >= 1),
    CHECK (late_fee_amount >= 0 OR late_fee_percentage >= 0),
    CHECK (early_payment_discount_percentage >= 0 AND early_payment_discount_percentage <= 100)
);

-- =============================================
-- STUDENT FEE ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS student_fee_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE NOT NULL,
    
    -- Customized amount (can override fee structure base amount)
    assigned_amount DECIMAL(10,2) NOT NULL CHECK (assigned_amount >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS (assigned_amount - discount_amount - (assigned_amount * discount_percentage / 100)) STORED,
    
    -- Assignment details
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    
    -- Installment configuration
    installments_enabled BOOLEAN DEFAULT false,
    total_installments INTEGER DEFAULT 1,
    
    -- Status and notes
    is_active BOOLEAN DEFAULT true,
    waiver_applied BOOLEAN DEFAULT false,
    waiver_amount DECIMAL(10,2) DEFAULT 0,
    waiver_reason TEXT,
    waiver_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    notes TEXT,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(student_id, fee_structure_id, academic_year),
    CHECK (total_installments >= 1),
    CHECK (waiver_amount >= 0),
    CHECK (discount_amount + waiver_amount <= assigned_amount)
);

-- =============================================
-- INSTALLMENT PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS installment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_fee_assignment_id UUID REFERENCES student_fee_assignments(id) ON DELETE CASCADE NOT NULL,
    
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    description TEXT,
    
    is_paid BOOLEAN DEFAULT false,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    paid_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(student_fee_assignment_id, installment_number),
    CHECK (installment_number > 0),
    CHECK (paid_amount >= 0 AND paid_amount <= amount)
);

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    late_fee_amount DECIMAL(10,2) DEFAULT 0 CHECK (late_fee_amount >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal - discount_amount + late_fee_amount + tax_amount) STORED,
    
    paid_amount DECIMAL(10,2) DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal - discount_amount + late_fee_amount + tax_amount - paid_amount) STORED,
    
    -- Status and metadata
    status invoice_status DEFAULT 'draft',
    payment_status payment_status DEFAULT 'pending',
    
    -- Additional information
    notes TEXT,
    terms_and_conditions TEXT,
    pdf_url TEXT, -- URL to generated PDF invoice
    
    -- Tracking
    sent_date DATE,
    sent_to_email VARCHAR(255),
    sent_to_phone VARCHAR(20),
    
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (paid_amount <= (subtotal - discount_amount + late_fee_amount + tax_amount))
);

-- =============================================
-- INVOICE LINE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,

    -- Line item details
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Discounts specific to this line item
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount - (quantity * unit_price * discount_percentage / 100)) STORED,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL, -- Can be NULL for advance payments

    -- Payment details
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),

    -- Payment method details
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100), -- Cheque number, transaction ID, etc.
    bank_name VARCHAR(100),
    branch_name VARCHAR(100),

    -- Online payment details
    gateway_transaction_id VARCHAR(100),
    gateway_name VARCHAR(50), -- Stripe, PayPal, Razorpay, etc.
    gateway_fee DECIMAL(10,2) DEFAULT 0,

    -- Status and verification
    status payment_status DEFAULT 'paid',
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Additional information
    notes TEXT,
    receipt_url TEXT, -- URL to payment receipt

    -- Tracking
    received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENT ALLOCATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    student_fee_assignment_id UUID REFERENCES student_fee_assignments(id) ON DELETE SET NULL,

    allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_date DATE DEFAULT CURRENT_DATE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FINANCIAL TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,

    -- Transaction details
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    transaction_type transaction_type NOT NULL,

    -- Amounts
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE
            WHEN transaction_type IN ('payment', 'discount', 'waiver') THEN balance_before - amount
            WHEN transaction_type IN ('refund', 'late_fee', 'adjustment') THEN balance_before + amount
            ELSE balance_before
        END
    ) STORED,

    -- References
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,

    -- Additional information
    description TEXT NOT NULL,
    notes TEXT,

    -- Tracking
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LATE FEES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS late_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_fee_assignment_id UUID REFERENCES student_fee_assignments(id) ON DELETE CASCADE NOT NULL,

    -- Late fee calculation
    original_due_date DATE NOT NULL,
    days_overdue INTEGER NOT NULL CHECK (days_overdue > 0),
    late_fee_amount DECIMAL(10,2) NOT NULL CHECK (late_fee_amount > 0),

    -- Status
    is_applied BOOLEAN DEFAULT false,
    applied_date DATE,
    is_waived BOOLEAN DEFAULT false,
    waived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    waived_date DATE,
    waiver_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- REFUNDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

    -- Refund details
    refund_number VARCHAR(50) UNIQUE NOT NULL,
    refund_date DATE DEFAULT CURRENT_DATE,
    refund_amount DECIMAL(10,2) NOT NULL CHECK (refund_amount > 0),

    -- Refund method
    refund_method payment_method NOT NULL,
    refund_reference VARCHAR(100),

    -- Reason and approval
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
    processed_date DATE,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENT REMINDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,

    -- Reminder details
    reminder_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    days_overdue INTEGER DEFAULT 0,
    outstanding_amount DECIMAL(10,2) NOT NULL CHECK (outstanding_amount > 0),

    -- Communication details
    reminder_type VARCHAR(20) DEFAULT 'email' CHECK (reminder_type IN ('email', 'sms', 'phone', 'letter')),
    sent_to_email VARCHAR(255),
    sent_to_phone VARCHAR(20),

    -- Status
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),

    -- Template and content
    template_used VARCHAR(100),
    message_content TEXT,

    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FEE REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS fee_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,

    -- Report details
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'collection', 'outstanding', 'refunds', 'summary'
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,

    -- Filters applied
    class_filter JSONB, -- Array of class IDs
    fee_type_filter JSONB, -- Array of fee types
    payment_status_filter JSONB, -- Array of payment statuses

    -- Report data (stored as JSON for flexibility)
    report_data JSONB NOT NULL,
    summary_statistics JSONB,

    -- File information
    pdf_url TEXT,
    excel_url TEXT,

    -- Status and metadata
    status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Fee structures indexes
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_id ON fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year ON fee_structures(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_structures_fee_type ON fee_structures(fee_type);
CREATE INDEX IF NOT EXISTS idx_fee_structures_due_date ON fee_structures(due_date);

-- Student fee assignments indexes
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_school_id ON student_fee_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_student_id ON student_fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_due_date ON student_fee_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_academic_year ON student_fee_assignments(academic_year);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_school_id ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Financial transactions indexes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_school_id ON financial_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_student_id ON financial_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(school_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    school_code VARCHAR(10);
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
    invoice_num VARCHAR(50);
BEGIN
    -- Get school code
    SELECT s.school_code INTO school_code
    FROM schools s
    WHERE s.id = school_id;

    -- Get current year suffix
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

    -- Get next sequence number for this school and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoices.school_id = generate_invoice_number.school_id
    AND invoice_number LIKE school_code || '-INV-' || year_suffix || '-%';

    -- Generate invoice number: SCHOOLCODE-INV-YYYY-NNNN
    invoice_num := school_code || '-INV-' || year_suffix || '-' || LPAD(sequence_num::VARCHAR, 4, '0');

    RETURN invoice_num;
END;
$$;

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number(school_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    school_code VARCHAR(10);
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
    payment_num VARCHAR(50);
BEGIN
    -- Get school code
    SELECT s.school_code INTO school_code
    FROM schools s
    WHERE s.id = school_id;

    -- Get current year suffix
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

    -- Get next sequence number for this school and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM payments
    WHERE payments.school_id = generate_payment_number.school_id
    AND payment_number LIKE school_code || '-PAY-' || year_suffix || '-%';

    -- Generate payment number: SCHOOLCODE-PAY-YYYY-NNNN
    payment_num := school_code || '-PAY-' || year_suffix || '-' || LPAD(sequence_num::VARCHAR, 4, '0');

    RETURN payment_num;
END;
$$;

-- Function to calculate late fees
CREATE OR REPLACE FUNCTION calculate_late_fee(
    assignment_id UUID,
    current_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assignment_record RECORD;
    fee_structure_record RECORD;
    days_overdue INTEGER;
    late_fee_amount DECIMAL(10,2) := 0;
BEGIN
    -- Get assignment details
    SELECT * INTO assignment_record
    FROM student_fee_assignments
    WHERE id = assignment_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Get fee structure details
    SELECT * INTO fee_structure_record
    FROM fee_structures
    WHERE id = assignment_record.fee_structure_id;

    IF NOT FOUND OR NOT fee_structure_record.late_fee_enabled THEN
        RETURN 0;
    END IF;

    -- Calculate days overdue
    days_overdue := current_date - assignment_record.due_date - fee_structure_record.grace_period_days;

    IF days_overdue <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate late fee
    IF fee_structure_record.late_fee_amount > 0 THEN
        late_fee_amount := fee_structure_record.late_fee_amount;
    ELSIF fee_structure_record.late_fee_percentage > 0 THEN
        late_fee_amount := assignment_record.final_amount * fee_structure_record.late_fee_percentage / 100;
    END IF;

    RETURN late_fee_amount;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all fee management tables
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reports ENABLE ROW LEVEL SECURITY;

-- Fee structures policies
CREATE POLICY "Users can view fee structures for their school" ON fee_structures
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage fee structures for their school" ON fee_structures
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Student fee assignments policies
CREATE POLICY "Users can view fee assignments for their school" ON student_fee_assignments
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own fee assignments" ON student_fee_assignments
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage fee assignments for their school" ON student_fee_assignments
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Invoices policies
CREATE POLICY "Users can view invoices for their school" ON invoices
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own invoices" ON invoices
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage invoices for their school" ON invoices
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Payments policies
CREATE POLICY "Users can view payments for their school" ON payments
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own payments" ON payments
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage payments for their school" ON payments
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Financial transactions policies
CREATE POLICY "Users can view transactions for their school" ON financial_transactions
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own transactions" ON financial_transactions
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage transactions for their school" ON financial_transactions
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Similar policies for other tables (installment_plans, invoice_line_items, etc.)
-- Following the same pattern: school-based access with role-based permissions

-- Installment plans policies (inherit from student_fee_assignments)
CREATE POLICY "Users can view installment plans for their school" ON installment_plans
    FOR SELECT USING (
        student_fee_assignment_id IN (
            SELECT id FROM student_fee_assignments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage installment plans for their school" ON installment_plans
    FOR ALL USING (
        student_fee_assignment_id IN (
            SELECT id FROM student_fee_assignments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Invoice line items policies (inherit from invoices)
CREATE POLICY "Users can view invoice line items for their school" ON invoice_line_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage invoice line items for their school" ON invoice_line_items
    FOR ALL USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Payment allocations policies (inherit from payments)
CREATE POLICY "Users can view payment allocations for their school" ON payment_allocations
    FOR SELECT USING (
        payment_id IN (
            SELECT id FROM payments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage payment allocations for their school" ON payment_allocations
    FOR ALL USING (
        payment_id IN (
            SELECT id FROM payments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Late fees policies (inherit from student_fee_assignments)
CREATE POLICY "Users can view late fees for their school" ON late_fees
    FOR SELECT USING (
        student_fee_assignment_id IN (
            SELECT id FROM student_fee_assignments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage late fees for their school" ON late_fees
    FOR ALL USING (
        student_fee_assignment_id IN (
            SELECT id FROM student_fee_assignments
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Refunds policies
CREATE POLICY "Users can view refunds for their school" ON refunds
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own refunds" ON refunds
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage refunds for their school" ON refunds
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Payment reminders policies
CREATE POLICY "Users can view payment reminders for their school" ON payment_reminders
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own payment reminders" ON payment_reminders
    FOR SELECT USING (
        student_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage payment reminders for their school" ON payment_reminders
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- Fee reports policies
CREATE POLICY "Admins can manage fee reports for their school" ON fee_reports
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        ) AND (
            SELECT get_user_role() IN ('admin', 'sub-admin')
        )
    );

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE invoices
    SET subtotal = (
        SELECT COALESCE(SUM(final_amount), 0)
        FROM invoice_line_items
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_totals();

-- Trigger to update payment status when payments are made
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update invoice payment status based on paid amount
    UPDATE invoices
    SET paid_amount = (
        SELECT COALESCE(SUM(pa.allocated_amount), 0)
        FROM payment_allocations pa
        JOIN payments p ON pa.payment_id = p.id
        WHERE pa.invoice_id = invoices.id
        AND p.status = 'paid'
    ),
    payment_status = CASE
        WHEN (SELECT COALESCE(SUM(pa.allocated_amount), 0)
              FROM payment_allocations pa
              JOIN payments p ON pa.payment_id = p.id
              WHERE pa.invoice_id = invoices.id
              AND p.status = 'paid') >= total_amount THEN 'paid'
        WHEN (SELECT COALESCE(SUM(pa.allocated_amount), 0)
              FROM payment_allocations pa
              JOIN payments p ON pa.payment_id = p.id
              WHERE pa.invoice_id = invoices.id
              AND p.status = 'paid') > 0 THEN 'partial'
        ELSE 'pending'
    END,
    updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_status
    AFTER INSERT OR UPDATE ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

-- =============================================
-- INITIAL PERMISSIONS DATA
-- =============================================

-- Insert fee management permissions
INSERT INTO permissions (name, display_name, description, module, action) VALUES
('fees.read', 'View Fees', 'View fee structures and assignments', 'fees', 'read'),
('fees.create', 'Create Fees', 'Create new fee structures', 'fees', 'create'),
('fees.update', 'Update Fees', 'Modify existing fee structures', 'fees', 'update'),
('fees.delete', 'Delete Fees', 'Remove fee structures', 'fees', 'delete'),
('payments.read', 'View Payments', 'View payment records', 'payments', 'read'),
('payments.create', 'Record Payments', 'Record new payments', 'payments', 'create'),
('payments.update', 'Update Payments', 'Modify payment records', 'payments', 'update'),
('payments.verify', 'Verify Payments', 'Verify and approve payments', 'payments', 'verify'),
('invoices.read', 'View Invoices', 'View invoices and billing', 'invoices', 'read'),
('invoices.create', 'Create Invoices', 'Generate new invoices', 'invoices', 'create'),
('invoices.update', 'Update Invoices', 'Modify existing invoices', 'invoices', 'update'),
('invoices.send', 'Send Invoices', 'Send invoices to students/parents', 'invoices', 'send'),
('refunds.read', 'View Refunds', 'View refund requests and records', 'refunds', 'read'),
('refunds.create', 'Process Refunds', 'Create and process refunds', 'refunds', 'create'),
('refunds.approve', 'Approve Refunds', 'Approve refund requests', 'refunds', 'approve'),
('financial_reports.read', 'View Financial Reports', 'Access financial reports and analytics', 'financial_reports', 'read'),
('financial_reports.create', 'Generate Reports', 'Generate financial reports', 'financial_reports', 'create')
ON CONFLICT (name) DO NOTHING;
