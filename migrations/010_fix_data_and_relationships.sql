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
  current_plan_id UUID,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
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

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

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
CREATE INDEX IF NOT EXISTS profiles_current_plan_id_idx ON profiles(current_plan_id);
CREATE INDEX IF NOT EXISTS plans_name_idx ON plans(name);
CREATE INDEX IF NOT EXISTS subscriptions_student_id_idx ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS classes_coach_id_idx ON classes(coach_id);

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

-- Create function to update student revenue when plan changes
CREATE OR REPLACE FUNCTION update_student_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- If current_plan_id is being set or changed
  IF NEW.current_plan_id IS NOT NULL AND (OLD.current_plan_id IS NULL OR OLD.current_plan_id != NEW.current_plan_id) THEN
    -- Get the plan price
    SELECT price INTO NEW.revenue
    FROM plans
    WHERE id = NEW.current_plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update revenue when plan changes
CREATE TRIGGER update_student_revenue_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.current_plan_id IS DISTINCT FROM OLD.current_plan_id)
  EXECUTE FUNCTION update_student_revenue(); 