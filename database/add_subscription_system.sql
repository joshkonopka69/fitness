-- ===============================================
-- FitnessGuru Subscription System
-- First-time users get 30 days FREE premium
-- ===============================================

-- Step 1: Add subscription columns to coach_profiles
ALTER TABLE coach_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Add comments for documentation
COMMENT ON COLUMN coach_profiles.trial_ends_at IS '30-day free trial end date (set on first login)';
COMMENT ON COLUMN coach_profiles.subscription_status IS 'trial, active, expired, or cancelled';
COMMENT ON COLUMN coach_profiles.subscription_ends_at IS 'When paid subscription expires';
COMMENT ON COLUMN coach_profiles.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN coach_profiles.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN coach_profiles.beta_tester IS 'Beta testers get extra 3 months free';
COMMENT ON COLUMN coach_profiles.premium_started_at IS 'When premium access started';

-- Step 3: Update existing users to have trial (ONLY RUN ONCE!)
UPDATE coach_profiles
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'trial',
  premium_started_at = NOW()
WHERE trial_ends_at IS NULL;

-- Step 4: Create function to check subscription status
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

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_coach_profiles_subscription_status ON coach_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_stripe_customer ON coach_profiles(stripe_customer_id);

-- Step 6: Create payments table for transaction history
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

-- Step 7: Create function to record payment
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

-- Step 8: Create function to activate subscription after successful payment
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

-- ===============================================
-- USAGE EXAMPLES
-- ===============================================

-- Check if coach subscription is active:
-- SELECT * FROM check_subscription_status('coach-uuid-here');

-- Record a successful payment:
-- SELECT record_payment(
--   'coach-uuid',
--   19.00,
--   'PLN',
--   'succeeded',
--   'pi_stripe_id',
--   'card',
--   'Monthly subscription payment'
-- );

-- Activate subscription after payment:
-- SELECT activate_subscription('coach-uuid', 'sub_stripe_id', 1);

-- ===============================================
-- MIGRATION COMPLETE ✅
-- ===============================================

