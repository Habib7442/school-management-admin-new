-- =============================================
-- ROW LEVEL SECURITY POLICIES FOR LIBRARY MANAGEMENT
-- =============================================
-- Comprehensive RLS policies ensuring proper access control for library operations

-- =============================================
-- ENABLE RLS ON ALL LIBRARY TABLES
-- =============================================

ALTER TABLE library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS FOR LIBRARY ACCESS
-- =============================================

-- Check if user is a librarian (admin, sub-admin, or has library permissions)
CREATE OR REPLACE FUNCTION is_librarian()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'sub-admin') 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a library member
CREATE OR REPLACE FUNCTION is_library_member()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM library_members 
        WHERE profile_id = auth.uid() 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's library member ID
CREATE OR REPLACE FUNCTION get_library_member_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM library_members 
        WHERE profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access library resources (librarian or active member)
CREATE OR REPLACE FUNCTION can_access_library()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_librarian() OR is_library_member();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- LIBRARY CATEGORIES POLICIES
-- =============================================

-- Librarians can manage all categories in their school
CREATE POLICY "Librarians can manage categories" ON library_categories
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Library users can view categories
CREATE POLICY "Library users can view categories" ON library_categories
    FOR SELECT USING (
        can_access_library() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- =============================================
-- BOOKS POLICIES
-- =============================================

-- Librarians can manage all books in their school
CREATE POLICY "Librarians can manage books" ON books
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Library users can view active books
CREATE POLICY "Library users can view books" ON books
    FOR SELECT USING (
        can_access_library() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) AND
        status = 'active'
    );

-- =============================================
-- BOOK COPIES POLICIES
-- =============================================

-- Librarians can manage all book copies in their school
CREATE POLICY "Librarians can manage book copies" ON book_copies
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Library users can view available book copies
CREATE POLICY "Library users can view book copies" ON book_copies
    FOR SELECT USING (
        can_access_library() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) AND
        status IN ('available', 'borrowed', 'reserved')
    );

-- =============================================
-- LIBRARY MEMBERS POLICIES
-- =============================================

-- Librarians can manage all members in their school
CREATE POLICY "Librarians can manage members" ON library_members
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Users can view their own library member record
CREATE POLICY "Users can view own member record" ON library_members
    FOR SELECT USING (
        profile_id = auth.uid()
    );

-- Users can update limited fields in their own record
CREATE POLICY "Users can update own member preferences" ON library_members
    FOR UPDATE USING (
        profile_id = auth.uid()
    ) WITH CHECK (
        profile_id = auth.uid() AND
        -- Only allow updating notification preferences and contact info
        (OLD.library_card_number = NEW.library_card_number) AND
        (OLD.member_type = NEW.member_type) AND
        (OLD.max_books_allowed = NEW.max_books_allowed) AND
        (OLD.status = NEW.status)
    );

-- =============================================
-- BORROWING TRANSACTIONS POLICIES
-- =============================================

-- Librarians can manage all transactions in their school
CREATE POLICY "Librarians can manage transactions" ON borrowing_transactions
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Members can view their own borrowing history
CREATE POLICY "Members can view own transactions" ON borrowing_transactions
    FOR SELECT USING (
        member_id = get_library_member_id() AND
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- =============================================
-- RESERVATIONS POLICIES
-- =============================================

-- Librarians can manage all reservations in their school
CREATE POLICY "Librarians can manage reservations" ON reservations
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Members can view and manage their own reservations
CREATE POLICY "Members can manage own reservations" ON reservations
    FOR ALL USING (
        member_id = get_library_member_id() AND
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- =============================================
-- FINES POLICIES
-- =============================================

-- Librarians can manage all fines in their school
CREATE POLICY "Librarians can manage fines" ON fines
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Members can view their own fines
CREATE POLICY "Members can view own fines" ON fines
    FOR SELECT USING (
        member_id = get_library_member_id() AND
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- =============================================
-- LIBRARY SETTINGS POLICIES
-- =============================================

-- Only librarians can manage library settings
CREATE POLICY "Librarians can manage settings" ON library_settings
    FOR ALL USING (
        is_librarian() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- Library users can view settings (for understanding policies)
CREATE POLICY "Library users can view settings" ON library_settings
    FOR SELECT USING (
        can_access_library() AND 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

-- =============================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =============================================

-- Function to check if a book can be borrowed by a member
CREATE OR REPLACE FUNCTION can_borrow_book(book_copy_uuid UUID, member_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    copy_status VARCHAR(20);
    member_status VARCHAR(20);
    current_books INTEGER;
    max_books INTEGER;
    current_fines DECIMAL(10,2);
    max_fine_amount DECIMAL(10,2);
BEGIN
    -- Check copy status
    SELECT status INTO copy_status FROM book_copies WHERE id = book_copy_uuid;
    IF copy_status != 'available' THEN
        RETURN FALSE;
    END IF;
    
    -- Check member status
    SELECT status, current_fines, max_books_allowed 
    INTO member_status, current_fines, max_books 
    FROM library_members 
    WHERE id = member_uuid;
    
    IF member_status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    -- Check current book limit
    SELECT COUNT(*) INTO current_books 
    FROM borrowing_transactions 
    WHERE member_id = member_uuid AND status = 'active';
    
    IF current_books >= max_books THEN
        RETURN FALSE;
    END IF;
    
    -- Check fine limit
    SELECT max_fine_amount INTO max_fine_amount 
    FROM library_settings 
    WHERE school_id = (SELECT school_id FROM library_members WHERE id = member_uuid);
    
    IF current_fines >= max_fine_amount THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate overdue fines
CREATE OR REPLACE FUNCTION calculate_overdue_fine(transaction_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    due_date DATE;
    daily_rate DECIMAL(10,2);
    days_overdue INTEGER;
    max_fine DECIMAL(10,2);
    calculated_fine DECIMAL(10,2);
    school_uuid UUID;
BEGIN
    -- Get transaction details
    SELECT bt.due_date, bt.school_id 
    INTO due_date, school_uuid
    FROM borrowing_transactions bt 
    WHERE bt.id = transaction_uuid;
    
    -- Calculate days overdue
    days_overdue := GREATEST(0, CURRENT_DATE - due_date);
    
    IF days_overdue = 0 THEN
        RETURN 0;
    END IF;
    
    -- Get fine rates from settings
    SELECT daily_overdue_fine, max_fine_amount 
    INTO daily_rate, max_fine
    FROM library_settings 
    WHERE school_id = school_uuid;
    
    -- Calculate fine
    calculated_fine := days_overdue * daily_rate;
    
    -- Apply maximum fine limit
    RETURN LEAST(calculated_fine, max_fine);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
