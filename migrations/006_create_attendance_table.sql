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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR profiles.id = student_id
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = attendance.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = attendance.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can update attendance"
  ON attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = attendance.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can delete attendance"
  ON attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = attendance.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

-- Create indexes for faster lookups
CREATE INDEX attendance_class_id_idx ON attendance(class_id);
CREATE INDEX attendance_student_id_idx ON attendance(student_id);
CREATE INDEX attendance_date_idx ON attendance(date);
CREATE INDEX attendance_status_idx ON attendance(status); 