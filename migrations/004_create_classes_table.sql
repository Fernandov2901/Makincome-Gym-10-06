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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes for faster lookups
CREATE INDEX classes_coach_id_idx ON classes(coach_id);
CREATE INDEX classes_start_time_idx ON classes(start_time); 