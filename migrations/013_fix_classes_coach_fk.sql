ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_coach_id_fkey,
  ADD CONSTRAINT classes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL; 