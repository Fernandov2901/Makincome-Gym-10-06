-- Create coach_schedule table
CREATE TABLE IF NOT EXISTS coach_schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(gym_id, date, role)
);

-- Trigger to update updated_at
CREATE TRIGGER update_coach_schedule_updated_at
  BEFORE UPDATE ON coach_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE coach_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Only owners can manage their gym's schedule
CREATE POLICY "Gym owners can manage their own coach schedule"
  ON coach_schedule
  FOR ALL
  TO authenticated
  USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );

-- Policy: Coaches can view their own assignments
CREATE POLICY "Coaches can view their own schedule"
  ON coach_schedule
  FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'coach'
    )
  ); 