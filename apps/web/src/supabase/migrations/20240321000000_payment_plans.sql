-- Create payment_plans table
CREATE TABLE payment_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- Duration in months
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add payment_plan_id to user_profiles
ALTER TABLE user_profiles
ADD COLUMN payment_plan_id UUID REFERENCES payment_plans(id),
ADD COLUMN plan_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN plan_end_date TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_plans
CREATE POLICY "Gym owners can manage their own payment plans"
    ON payment_plans
    FOR ALL
    TO authenticated
    USING (
        gym_id IN (
            SELECT id FROM gyms
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their gym's payment plans"
    ON payment_plans
    FOR SELECT
    TO authenticated
    USING (
        gym_id IN (
            SELECT gym_id FROM user_profiles
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payment_plans
CREATE TRIGGER update_payment_plans_updated_at
    BEFORE UPDATE ON payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 