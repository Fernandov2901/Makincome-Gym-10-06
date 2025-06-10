-- Update classes table with additional fields
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS min_capacity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS equipment TEXT[],
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Create class_templates table for recurring classes
CREATE TABLE IF NOT EXISTS class_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty_level TEXT,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  default_capacity INTEGER,
  default_min_capacity INTEGER DEFAULT 1,
  duration INTEGER NOT NULL, -- in minutes
  equipment TEXT[],
  prerequisites TEXT,
  image_url TEXT,
  color TEXT,
  default_price DECIMAL(10, 2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_waitlist table
CREATE TABLE IF NOT EXISTS class_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- Create class_feedback table
CREATE TABLE IF NOT EXISTS class_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  feedback_text TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE(class_id, user_id)
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_class_templates_updated_at
BEFORE UPDATE ON class_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_waitlist_updated_at
BEFORE UPDATE ON class_waitlist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_feedback_updated_at
BEFORE UPDATE ON class_feedback
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_templates_gym_id ON class_templates(gym_id);
CREATE INDEX IF NOT EXISTS idx_class_templates_coach_id ON class_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_templates_status ON class_templates(status);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_class_id ON class_waitlist(class_id);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_user_id ON class_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_status ON class_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_class_feedback_class_id ON class_feedback(class_id);
CREATE INDEX IF NOT EXISTS idx_class_feedback_user_id ON class_feedback(user_id);

-- Enable RLS for new tables
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_feedback ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY owner_class_templates_policy ON class_templates
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner'));

CREATE POLICY coach_class_templates_policy ON class_templates
  USING (coach_id = auth.uid());

CREATE POLICY owner_class_waitlist_policy ON class_waitlist
  USING (class_id IN (SELECT c.id FROM classes c WHERE c.gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner')));

CREATE POLICY user_class_waitlist_policy ON class_waitlist
  USING (user_id = auth.uid());

CREATE POLICY owner_class_feedback_policy ON class_feedback
  USING (class_id IN (SELECT c.id FROM classes c WHERE c.gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner')));

CREATE POLICY user_class_feedback_policy ON class_feedback
  USING (user_id = auth.uid());

-- Function to check class availability
CREATE OR REPLACE FUNCTION check_class_availability(
  p_class_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_capacity INTEGER;
  v_current_signups INTEGER;
  v_is_bookable BOOLEAN;
  v_is_cancelled BOOLEAN;
BEGIN
  SELECT 
    c.capacity,
    COUNT(cs.id),
    c.is_bookable,
    c.is_cancelled
  INTO 
    v_capacity,
    v_current_signups,
    v_is_bookable,
    v_is_cancelled
  FROM classes c
  LEFT JOIN class_signups cs ON c.id = cs.class_id
  WHERE c.id = p_class_id
  GROUP BY c.capacity, c.is_bookable, c.is_cancelled;
  
  -- Check if class is available
  RETURN (v_is_bookable AND NOT v_is_cancelled AND v_current_signups < v_capacity);
END;
$$ LANGUAGE plpgsql; 