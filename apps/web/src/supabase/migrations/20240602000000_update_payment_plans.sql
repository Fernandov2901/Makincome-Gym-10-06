-- Add new columns to payment_plans table
ALTER TABLE payment_plans 
  ADD COLUMN IF NOT EXISTS duration_unit TEXT DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS is_product BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;

-- Add check constraint for duration unit
ALTER TABLE payment_plans 
  ADD CONSTRAINT check_duration_unit CHECK (duration_unit IN ('days', 'weeks', 'months', 'years'));

-- Add new index
CREATE INDEX IF NOT EXISTS idx_payment_plans_product_id ON payment_plans(product_id);

-- Update RLS policy to include product membership options
DROP POLICY IF EXISTS payment_plans_policy ON payment_plans;

CREATE POLICY payment_plans_policy ON payment_plans
  USING (gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'owner')
    OR gym_id IN (SELECT gym_id FROM user_profiles WHERE user_id = auth.uid()));

-- Create helper function to calculate expiration date based on duration and unit
CREATE OR REPLACE FUNCTION calculate_expiration_date(
  start_date TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  duration_unit TEXT
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE
    WHEN duration_unit = 'days' THEN
      RETURN start_date + (duration || ' days')::INTERVAL;
    WHEN duration_unit = 'weeks' THEN
      RETURN start_date + (duration * 7 || ' days')::INTERVAL;
    WHEN duration_unit = 'months' THEN
      RETURN start_date + (duration || ' months')::INTERVAL;
    WHEN duration_unit = 'years' THEN
      RETURN start_date + (duration || ' years')::INTERVAL;
    ELSE
      RETURN start_date + (duration || ' days')::INTERVAL;
  END CASE;
END;
$$ LANGUAGE plpgsql; 