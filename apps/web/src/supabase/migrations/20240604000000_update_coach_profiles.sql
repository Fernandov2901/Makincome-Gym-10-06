-- Update coach_profiles table with additional fields
ALTER TABLE coach_profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[],
  ADD COLUMN IF NOT EXISTS certifications TEXT[],
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS class_commission_rate DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_classes_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS social_media JSONB,
  ADD COLUMN IF NOT EXISTS availability JSONB,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Create coach_commissions table to track earnings
CREATE TABLE IF NOT EXISTS coach_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coach_attendance table to track coach presence
CREATE TABLE IF NOT EXISTS coach_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  hours_worked DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coach_reviews table to track feedback
CREATE TABLE IF NOT EXISTS coach_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to check commission_type
ALTER TABLE coach_profiles 
  ADD CONSTRAINT check_commission_type CHECK (commission_type IN ('percentage', 'fixed', 'tiered', 'none'));

-- Set up triggers for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_commissions_updated_at
BEFORE UPDATE ON coach_commissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_attendance_updated_at
BEFORE UPDATE ON coach_attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_reviews_updated_at
BEFORE UPDATE ON coach_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_commissions_gym_id ON coach_commissions(gym_id);
CREATE INDEX IF NOT EXISTS idx_coach_commissions_coach_id ON coach_commissions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_commissions_payment_status ON coach_commissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_gym_id ON coach_attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_coach_id ON coach_attendance(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_date ON coach_attendance(date);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_gym_id ON coach_reviews(gym_id);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_coach_id ON coach_reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_client_id ON coach_reviews(client_id);

-- Enable RLS for new tables
ALTER TABLE coach_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY owner_coach_commissions_policy ON coach_commissions
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner'));

CREATE POLICY coach_commissions_policy ON coach_commissions
  USING (coach_id = auth.uid());

CREATE POLICY owner_coach_attendance_policy ON coach_attendance
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner'));

CREATE POLICY coach_attendance_policy ON coach_attendance
  USING (coach_id = auth.uid());

CREATE POLICY owner_coach_reviews_policy ON coach_reviews
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner'));

CREATE POLICY coach_reviews_policy ON coach_reviews
  USING (coach_id = auth.uid());

-- Function to calculate coach commission based on sales
CREATE OR REPLACE FUNCTION calculate_coach_commission(
  p_coach_id UUID,
  p_sale_amount DECIMAL,
  p_commission_rate DECIMAL DEFAULT 0.1
) RETURNS DECIMAL AS $$
DECLARE
  v_commission DECIMAL;
  v_coach_tier TEXT;
  v_final_rate DECIMAL;
BEGIN
  -- Get the coach's tier or level
  SELECT tier INTO v_coach_tier
  FROM coaches
  WHERE id = p_coach_id;
  
  -- Adjust commission rate based on coach tier
  CASE v_coach_tier
    WHEN 'senior' THEN v_final_rate := p_commission_rate * 1.5;
    WHEN 'expert' THEN v_final_rate := p_commission_rate * 2.0;
    ELSE v_final_rate := p_commission_rate;
  END CASE;
  
  -- Calculate the commission
  v_commission := p_sale_amount * v_final_rate;
  
  RETURN v_commission;
END;
$$ LANGUAGE plpgsql;

-- Create or replace coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  style TEXT,
  availableDays TEXT[] DEFAULT '{}',
  salary DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT DEFAULT 'standard',
  specialties TEXT[] DEFAULT '{}',
  bio TEXT,
  profile_image_url TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(email, gym_id)
);

-- Create function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for coaches table
CREATE TRIGGER set_coaches_updated_at
BEFORE UPDATE ON coaches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 