-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS class_enrollments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS profiles;

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

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
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

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
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

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  plan_id UUID REFERENCES plans(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  is_cancellable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create class_enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(class_id, student_id)
);

-- Create trigger for class_enrollments
CREATE TRIGGER update_class_enrollments_updated_at
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(class_id, student_id, date)
);

-- Create trigger for attendance
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

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

-- Create RLS policies for subscriptions
CREATE POLICY "Anyone can view subscriptions"
  ON subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Only owners can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can update subscriptions"
  ON subscriptions FOR UPDATE
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
CREATE INDEX IF NOT EXISTS subscriptions_student_id_idx ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS class_enrollments_class_id_idx ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS class_enrollments_student_id_idx ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS class_enrollments_status_idx ON class_enrollments(status);
CREATE INDEX IF NOT EXISTS attendance_class_id_idx ON attendance(class_id);
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON attendance(student_id);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
CREATE INDEX IF NOT EXISTS attendance_status_idx ON attendance(status);

-- Insert default settings
INSERT INTO settings (name, address, phone, email)
VALUES (
  'Makincome Gym',
  '123 Main St, City, State 12345',
  '(555) 123-4567',
  'info@makincomegym.com'
) ON CONFLICT DO NOTHING;

-- Insert default plans
INSERT INTO plans (name, description, price, duration_days)
VALUES 
  ('Yearly Plan', 'Annual membership with monthly payments of $105. Non-cancellable.', 105.00, 365),
  ('Monthly Plan', 'Flexible monthly membership at $95 per month.', 95.00, 30)
ON CONFLICT (name) DO UPDATE 
SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days; 