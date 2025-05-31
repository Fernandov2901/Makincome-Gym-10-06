-- Insert default plans
INSERT INTO plans (name, description, price, duration_days)
VALUES 
  ('Yearly Plan', 'Annual membership with monthly payments of $105. Non-cancellable.', 105.00, 365),
  ('Monthly Plan', 'Flexible monthly membership at $95 per month.', 95.00, 30)
ON CONFLICT (name) DO UPDATE 
SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days; 