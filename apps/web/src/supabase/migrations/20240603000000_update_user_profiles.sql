-- Add columns to user_profiles for enhanced client management
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS health_conditions TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS fitness_level TEXT,
  ADD COLUMN IF NOT EXISTS preferred_coach UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS total_check_ins INTEGER DEFAULT 0;

-- Create workout_progress table to track client progress
CREATE TABLE IF NOT EXISTS workout_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5, 2),
  height DECIMAL(5, 2),
  body_fat_percentage DECIMAL(5, 2),
  muscle_mass DECIMAL(5, 2),
  resting_heart_rate INTEGER,
  blood_pressure TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercise_records table to track specific exercises
CREATE TABLE IF NOT EXISTS exercise_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_progress_id UUID NOT NULL REFERENCES workout_progress(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL(7, 2),
  duration INTERVAL,
  distance DECIMAL(7, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create body_measurements table for detailed tracking
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  chest DECIMAL(5, 2),
  waist DECIMAL(5, 2),
  hips DECIMAL(5, 2),
  biceps DECIMAL(5, 2),
  thighs DECIMAL(5, 2),
  calves DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_workout_progress_updated_at
BEFORE UPDATE ON workout_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_records_updated_at
BEFORE UPDATE ON exercise_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_measurements_updated_at
BEFORE UPDATE ON body_measurements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_progress_user_id ON workout_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_gym_id ON workout_progress(gym_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_date ON workout_progress(date);
CREATE INDEX IF NOT EXISTS idx_exercise_records_workout_progress_id ON exercise_records(workout_progress_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_user_id ON exercise_records(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(date);

-- Enable RLS for new tables
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY owner_workout_progress_policy ON workout_progress
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner'));

CREATE POLICY user_workout_progress_policy ON workout_progress
  USING (user_id = auth.uid());

CREATE POLICY owner_exercise_records_policy ON exercise_records
  USING (user_id IN (
    SELECT up.user_id FROM user_profiles up 
    WHERE up.gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner')
  ));

CREATE POLICY user_exercise_records_policy ON exercise_records
  USING (user_id = auth.uid());

CREATE POLICY owner_body_measurements_policy ON body_measurements
  USING (user_id IN (
    SELECT up.user_id FROM user_profiles up 
    WHERE up.gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner')
  ));

CREATE POLICY user_body_measurements_policy ON body_measurements
  USING (user_id = auth.uid()); 