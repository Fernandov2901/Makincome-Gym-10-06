CREATE OR REPLACE VIEW coaches AS
SELECT * FROM user_profiles WHERE user_type = 'coach'; 