-- Add current_plan_id and revenue columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES plans(id),
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0.00;

-- Create function to update student revenue when plan changes
CREATE OR REPLACE FUNCTION update_student_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- If current_plan_id is being set or changed
  IF NEW.current_plan_id IS NOT NULL AND (OLD.current_plan_id IS NULL OR OLD.current_plan_id != NEW.current_plan_id) THEN
    -- Get the plan price
    SELECT price INTO NEW.revenue
    FROM plans
    WHERE id = NEW.current_plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update revenue when plan changes
CREATE TRIGGER update_student_revenue_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.current_plan_id IS DISTINCT FROM OLD.current_plan_id)
  EXECUTE FUNCTION update_student_revenue();

-- Create function to get student revenue
CREATE OR REPLACE FUNCTION get_student_revenue(student_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_revenue DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(p.price), 0.00)
  INTO total_revenue
  FROM subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.student_id = student_id
  AND s.status = 'active';
  
  RETURN total_revenue;
END;
$$ language 'plpgsql';

-- Create view for student revenue summary
CREATE OR REPLACE VIEW student_revenue_summary AS
SELECT 
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  pl.name as current_plan,
  pl.price as plan_price,
  p.revenue as current_revenue,
  get_student_revenue(p.id) as total_revenue
FROM profiles p
LEFT JOIN plans pl ON p.current_plan_id = pl.id
WHERE p.role = 'student';

-- Add RLS policy for student revenue view
CREATE POLICY "Anyone can view student revenue summary"
  ON student_revenue_summary FOR SELECT
  USING (true);

-- Create function to update all student revenues
CREATE OR REPLACE FUNCTION update_all_student_revenues()
RETURNS void AS $$
BEGIN
  UPDATE profiles p
  SET revenue = COALESCE((
    SELECT price 
    FROM plans 
    WHERE id = p.current_plan_id
  ), 0.00)
  WHERE p.role = 'student';
END;
$$ language 'plpgsql';

-- Update existing students with their current plan revenue
SELECT update_all_student_revenues(); 