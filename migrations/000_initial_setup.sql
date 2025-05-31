-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'coach', 'student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for plans
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for classes
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"open": "06:00", "close": "20:00"},
    "tuesday": {"open": "06:00", "close": "20:00"},
    "wednesday": {"open": "06:00", "close": "20:00"},
    "thursday": {"open": "06:00", "close": "20:00"},
    "friday": {"open": "06:00", "close": "20:00"},
    "saturday": {"open": "08:00", "close": "16:00"},
    "sunday": {"open": "08:00", "close": "16:00"}
  }',
  class_duration INTEGER NOT NULL DEFAULT 60,
  max_students_per_class INTEGER NOT NULL DEFAULT 20,
  allow_waitlist BOOLEAN NOT NULL DEFAULT true,
  auto_cancel_minutes INTEGER NOT NULL DEFAULT 1440,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for settings
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (name, address, phone, email)
VALUES (
  'Makincome Gym',
  '123 Main St, City, State 12345',
  '(555) 123-4567',
  'info@makincomegym.com'
) ON CONFLICT DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Only owners can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only owners can update profiles" ON profiles;
DROP POLICY IF EXISTS "Only owners can delete profiles" ON profiles;

DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
DROP POLICY IF EXISTS "Only owners can insert plans" ON plans;
DROP POLICY IF EXISTS "Only owners can update plans" ON plans;
DROP POLICY IF EXISTS "Only owners can delete plans" ON plans;

DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Only owners and coaches can insert classes" ON classes;
DROP POLICY IF EXISTS "Only owners and assigned coaches can update classes" ON classes;
DROP POLICY IF EXISTS "Only owners can delete classes" ON classes;

DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
DROP POLICY IF EXISTS "Only owners can update settings" ON settings;

-- Create RLS policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Only owners can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Create RLS policies for plans
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (true);

CREATE POLICY "Only owners can insert plans"
  ON plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can update plans"
  ON plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can delete plans"
  ON plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Create RLS policies for classes
CREATE POLICY "Anyone can view classes"
  ON classes FOR SELECT
  USING (true);

CREATE POLICY "Only owners and coaches can insert classes"
  ON classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('owner', 'coach')
    )
  );

CREATE POLICY "Only owners and assigned coaches can update classes"
  ON classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR (profiles.role = 'coach' AND profiles.id = coach_id)
      )
    )
  );

CREATE POLICY "Only owners can delete classes"
  ON classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Create RLS policies for settings
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Only owners can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS plans_name_idx ON plans(name);
CREATE INDEX IF NOT EXISTS classes_coach_id_idx ON classes(coach_id);
CREATE INDEX IF NOT EXISTS classes_start_time_idx ON classes(start_time); 