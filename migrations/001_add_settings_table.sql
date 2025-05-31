-- Create settings table
CREATE TABLE settings (
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
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
); 