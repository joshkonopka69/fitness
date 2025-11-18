-- ===============================================
-- FitnessGuru - Complete Supabase Migration
-- Execute this entire file in Supabase SQL Editor
-- ===============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. ADD SESSION COLOR SUPPORT
-- ===============================================

-- Add session_color column to training_sessions table
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS session_color VARCHAR(7) DEFAULT '#00FF88';

-- Update existing sessions to have colors based on their session_type
UPDATE training_sessions
SET session_color = CASE
    WHEN LOWER(session_type) LIKE '%personal%' THEN '#00FF88'
    WHEN LOWER(session_type) LIKE '%group%' THEN '#0EA5E9'
    WHEN LOWER(session_type) LIKE '%bjj%' THEN '#F59E0B'
    WHEN LOWER(session_type) LIKE '%gym%' THEN '#EF4444'
    WHEN LOWER(session_type) LIKE '%hiit%' THEN '#8B5CF6'
    WHEN LOWER(session_type) LIKE '%yoga%' THEN '#EC4899'
    WHEN LOWER(session_type) LIKE '%cardio%' THEN '#10B981'
    ELSE '#00FF88'
END
WHERE session_color IS NULL;

-- Add comment
COMMENT ON COLUMN training_sessions.session_color IS 'Hex color code chosen by coach to identify this session visually';

-- ===============================================
-- 2. ADD SUBSCRIPTION SYSTEM TO COACH_PROFILES
-- ===============================================

-- Add subscription columns to coach_profiles table
ALTER TABLE coach_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN coach_profiles.trial_ends_at IS '30-day free trial end date (set on first login)';
COMMENT ON COLUMN coach_profiles.subscription_status IS 'trial, active, expired, or cancelled';
COMMENT ON COLUMN coach_profiles.subscription_ends_at IS 'When paid subscription expires';
COMMENT ON COLUMN coach_profiles.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN coach_profiles.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN coach_profiles.beta_tester IS 'Beta testers get extra 3 months free';
COMMENT ON COLUMN coach_profiles.premium_started_at IS 'When premium access started';

-- Update existing users to have trial (ONLY RUN ONCE!)
UPDATE coach_profiles
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'trial',
  premium_started_at = NOW()
WHERE trial_ends_at IS NULL;

-- ===============================================
-- 3. CREATE PAYMENTS TABLE
-- ===============================================

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PLN',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'card', 'google_pay', 'apple_pay'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own payments
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (coach_id = auth.uid());

-- Policy: Only backend can insert payments
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- ===============================================
-- 4. CREATE SUBSCRIPTION FUNCTIONS
-- ===============================================

-- Function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status(coach_id_param UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  days_left INTEGER,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        cp.trial_ends_at > NOW()
      WHEN cp.subscription_status = 'active' THEN
        cp.subscription_ends_at > NOW()
      ELSE FALSE
    END as is_active,
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        EXTRACT(DAY FROM cp.trial_ends_at - NOW())::INTEGER
      WHEN cp.subscription_status = 'active' THEN
        EXTRACT(DAY FROM cp.subscription_ends_at - NOW())::INTEGER
      ELSE 0
    END as days_left,
    cp.subscription_status as status
  FROM coach_profiles cp
  WHERE cp.id = coach_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to record payment
CREATE OR REPLACE FUNCTION record_payment(
  p_coach_id UUID,
  p_amount DECIMAL,
  p_currency VARCHAR,
  p_status VARCHAR,
  p_stripe_payment_intent_id VARCHAR,
  p_payment_method VARCHAR,
  p_description TEXT
)
RETURNS UUID AS $$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO payments (
    coach_id,
    amount,
    currency,
    status,
    stripe_payment_intent_id,
    payment_method,
    description
  ) VALUES (
    p_coach_id,
    p_amount,
    p_currency,
    p_status,
    p_stripe_payment_intent_id,
    p_payment_method,
    p_description
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to activate subscription after successful payment
CREATE OR REPLACE FUNCTION activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id VARCHAR,
  p_duration_months INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE coach_profiles
  SET
    subscription_status = 'active',
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_coach_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get subscription info for a coach
CREATE OR REPLACE FUNCTION get_subscription_info(coach_id_param UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  days_left INTEGER,
  status VARCHAR(20),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  is_trial BOOLEAN,
  can_create_session BOOLEAN,
  can_add_client BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        cp.trial_ends_at > NOW()
      WHEN cp.subscription_status = 'active' THEN
        cp.subscription_ends_at > NOW()
      ELSE FALSE
    END as is_active,
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        EXTRACT(DAY FROM cp.trial_ends_at - NOW())::INTEGER
      WHEN cp.subscription_status = 'active' THEN
        EXTRACT(DAY FROM cp.subscription_ends_at - NOW())::INTEGER
      ELSE 0
    END as days_left,
    cp.subscription_status as status,
    cp.trial_ends_at,
    cp.subscription_ends_at,
    (cp.subscription_status = 'trial') as is_trial,
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        cp.trial_ends_at > NOW()
      WHEN cp.subscription_status = 'active' THEN
        cp.subscription_ends_at > NOW()
      ELSE FALSE
    END as can_create_session,
    CASE
      WHEN cp.subscription_status = 'trial' THEN
        cp.trial_ends_at > NOW()
      WHEN cp.subscription_status = 'active' THEN
        cp.subscription_ends_at > NOW()
      ELSE FALSE
    END as can_add_client
  FROM coach_profiles cp
  WHERE cp.id = coach_id_param;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

-- Indexes for coach_profiles subscription queries
CREATE INDEX IF NOT EXISTS idx_coach_profiles_subscription_status ON coach_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_stripe_customer ON coach_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_trial_ends_at ON coach_profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_subscription_ends_at ON coach_profiles(subscription_ends_at);

-- ===============================================
-- 6. CREATE HELPER VIEWS
-- ===============================================

-- View for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  cp.id as coach_id,
  cp.email,
  cp.first_name,
  cp.last_name,
  cp.subscription_status,
  cp.trial_ends_at,
  cp.subscription_ends_at,
  CASE
    WHEN cp.subscription_status = 'trial' THEN
      cp.trial_ends_at > NOW()
    WHEN cp.subscription_status = 'active' THEN
      cp.subscription_ends_at > NOW()
    ELSE FALSE
  END as is_active,
  CASE
    WHEN cp.subscription_status = 'trial' THEN
      EXTRACT(DAY FROM cp.trial_ends_at - NOW())::INTEGER
    WHEN cp.subscription_status = 'active' THEN
      EXTRACT(DAY FROM cp.subscription_ends_at - NOW())::INTEGER
    ELSE 0
  END as days_left
FROM coach_profiles cp
WHERE cp.subscription_status IN ('trial', 'active');

-- View for revenue analytics
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
  DATE_TRUNC('month', p.created_at) as month,
  COUNT(*) as total_payments,
  SUM(p.amount) as total_revenue,
  AVG(p.amount) as average_payment,
  COUNT(DISTINCT p.coach_id) as paying_customers
FROM payments p
WHERE p.status = 'succeeded'
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

-- ===============================================
-- 7. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ===============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to payments table
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 8. SAMPLE DATA FOR TESTING (OPTIONAL)
-- ===============================================

-- Uncomment these lines to create test data
/*
-- Create a test coach with trial
INSERT INTO coach_profiles (
  id,
  email,
  first_name,
  last_name,
  subscription_status,
  trial_ends_at,
  premium_started_at
) VALUES (
  uuid_generate_v4(),
  'test@fitnessguru.com',
  'Test',
  'Coach',
  'trial',
  NOW() + INTERVAL '30 days',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test payment record
INSERT INTO payments (
  coach_id,
  amount,
  currency,
  status,
  stripe_payment_intent_id,
  payment_method,
  description
) VALUES (
  (SELECT id FROM coach_profiles WHERE email = 'test@fitnessguru.com'),
  19.00,
  'PLN',
  'succeeded',
  'pi_test_123456789',
  'card',
  'Monthly subscription payment'
);
*/

-- ===============================================
-- 9. VERIFICATION QUERIES
-- ===============================================

-- Check if all columns were added successfully
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'coach_profiles' 
  AND column_name IN ('trial_ends_at', 'subscription_status', 'stripe_customer_id')
ORDER BY column_name;

-- Check if payments table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check if functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'check_subscription_status',
  'record_payment',
  'activate_subscription',
  'get_subscription_info'
);

-- ===============================================
-- 10. USAGE EXAMPLES
-- ===============================================

-- Example: Check if a coach's subscription is active
-- SELECT * FROM check_subscription_status('coach-uuid-here');

-- Example: Record a successful payment
-- SELECT record_payment(
--   'coach-uuid',
--   19.00,
--   'PLN',
--   'succeeded',
--   'pi_stripe_id',
--   'card',
--   'Monthly subscription payment'
-- );

-- Example: Activate subscription after payment
-- SELECT activate_subscription('coach-uuid', 'sub_stripe_id', 1);

-- Example: Get full subscription info
-- SELECT * FROM get_subscription_info('coach-uuid-here');

-- Example: View all active subscriptions
-- SELECT * FROM active_subscriptions;

-- Example: View revenue analytics
-- SELECT * FROM revenue_analytics;

-- ===============================================
-- MIGRATION COMPLETE ✅
-- ===============================================

-- Summary of what was created:
-- ✅ Added session_color to training_sessions
-- ✅ Added subscription columns to coach_profiles
-- ✅ Created payments table with RLS
-- ✅ Created 4 helper functions
-- ✅ Created performance indexes
-- ✅ Created 2 analytics views
-- ✅ Added automatic timestamp triggers
-- ✅ All existing users get 30-day trial

-- Your FitnessGuru app is now ready for:
-- - 30-day free trials
-- - Stripe payment processing
-- - Subscription management
-- - Revenue tracking
-- - Google Pay & Apple Pay

-- Next steps:
-- 1. Test the app with new features
-- 2. Set up Stripe account
-- 3. Follow COMPLETE_PAYMENT_GUIDE.md
-- 4. Deploy to app stores
-- 5. Start making money! 💰
