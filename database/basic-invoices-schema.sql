-- Basic Invoices Schema
-- This is a minimal schema for invoices if the full fee management schema is not available

-- Create basic invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Basic amount
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basic invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    
    -- Line item details
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_school_id ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_items_updated_at 
    BEFORE UPDATE ON invoice_line_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for invoices
CREATE POLICY "Users can view invoices from their school" ON invoices
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their school" ON invoices
    FOR INSERT WITH CHECK (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices from their school" ON invoices
    FOR UPDATE USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete invoices from their school" ON invoices
    FOR DELETE USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Basic RLS policies for invoice line items
CREATE POLICY "Users can view line items from their school invoices" ON invoice_line_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM invoices WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert line items for their school invoices" ON invoice_line_items
    FOR INSERT WITH CHECK (
        invoice_id IN (
            SELECT id FROM invoices WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update line items from their school invoices" ON invoice_line_items
    FOR UPDATE USING (
        invoice_id IN (
            SELECT id FROM invoices WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete line items from their school invoices" ON invoice_line_items
    FOR DELETE USING (
        invoice_id IN (
            SELECT id FROM invoices WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
