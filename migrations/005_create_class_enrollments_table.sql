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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_class_enrollments_updated_at
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own enrollments"
  ON class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR profiles.id = student_id
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = class_enrollments.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can insert enrollments"
  ON class_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = class_enrollments.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can update enrollments"
  ON class_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = class_enrollments.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

CREATE POLICY "Only owners and coaches can delete enrollments"
  ON class_enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'owner'
        OR EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = class_enrollments.class_id
          AND classes.coach_id = profiles.id
        )
      )
    )
  );

-- Create indexes for faster lookups
CREATE INDEX class_enrollments_class_id_idx ON class_enrollments(class_id);
CREATE INDEX class_enrollments_student_id_idx ON class_enrollments(student_id);
CREATE INDEX class_enrollments_status_idx ON class_enrollments(status); 