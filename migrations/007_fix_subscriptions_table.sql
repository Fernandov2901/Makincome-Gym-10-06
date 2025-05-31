-- Drop existing subscriptions table if it exists
DROP TABLE IF EXISTS subscriptions;

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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
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

CREATE POLICY "Only owners can delete subscriptions"
  ON subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS subscriptions_student_id_idx ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status); 