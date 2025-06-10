CREATE TABLE IF NOT EXISTS coach_profiles (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  style TEXT,
  days TEXT[],
  salary NUMERIC
); 