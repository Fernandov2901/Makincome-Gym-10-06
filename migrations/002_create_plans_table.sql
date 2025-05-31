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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create index for faster lookups
CREATE INDEX plans_name_idx ON plans(name); 