-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  plan_id UUID REFERENCES plans(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
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
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

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
CREATE INDEX subscriptions_student_id_idx ON subscriptions(student_id);
CREATE INDEX subscriptions_plan_id_idx ON subscriptions(plan_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status); 