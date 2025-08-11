-- Schools table for multi-tenant setup
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  geo_lat DECIMAL(10, 8),
  geo_lng DECIMAL(11, 8),
  contact_email TEXT,
  contact_phone TEXT,
  school_code TEXT UNIQUE NOT NULL,
  academic_start DATE,
  academic_end DATE,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  motto TEXT,
  principal_name TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add onboarding_completed column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON schools(admin_id);
CREATE INDEX IF NOT EXISTS idx_schools_school_code ON schools(school_code);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Function to generate unique school code
CREATE OR REPLACE FUNCTION generate_school_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM schools WHERE school_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schools_updated_at_trigger
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_schools_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can only see/modify their own school
CREATE POLICY "Admins can manage their own school" ON schools
  FOR ALL USING (admin_id = auth.uid());

-- Policy: Users can see their school's information
CREATE POLICY "Users can view their school" ON schools
  FOR SELECT USING (
    id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Update existing classes table to include school_id
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- Update RLS policy for classes to be school-specific
DROP POLICY IF EXISTS "Users can view classes" ON classes;
CREATE POLICY "Users can view school classes" ON classes
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON schools TO authenticated;
GRANT ALL ON classes TO authenticated;

-- Insert sample data for testing (optional)
-- INSERT INTO schools (admin_id, name, school_code, contact_email) 
-- VALUES ('admin-uuid-here', 'Sample School', 'SAMPLE', 'admin@sample.school');
