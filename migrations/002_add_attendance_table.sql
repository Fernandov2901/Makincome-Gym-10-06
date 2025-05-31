-- Create attendance table
CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES class_enrollments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (class_id, enrollment_id, date)
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
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_enrollment_id ON attendance(enrollment_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Add RLS policies
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow owners to manage all attendance records
CREATE POLICY "Owners can manage all attendance records"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Allow coaches to view and manage attendance for their classes
CREATE POLICY "Coaches can manage attendance for their classes"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.coach_id = auth.uid()
    )
  );

-- Allow students to view their own attendance
CREATE POLICY "Students can view their own attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.id = attendance.enrollment_id
      AND class_enrollments.user_id = auth.uid()
    )
  ); 