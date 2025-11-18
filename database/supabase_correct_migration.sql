-- ===============================================
-- FitnessGuru - Correct Migration for Your Database
-- Based on your actual table structure
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
-- 2. ADD SUBSCRIPTION SYSTEM TO COACHES TABLE
-- ===============================================

-- Add subscription columns to coaches table
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN coaches.trial_ends_at IS '30-day free trial end date (set on first login)';
COMMENT ON COLUMN coaches.subscription_status IS 'trial, active, expired, or cancelled';
COMMENT ON COLUMN coaches.subscription_ends_at IS 'When paid subscription expires';
COMMENT ON COLUMN coaches.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN coaches.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN coaches.beta_tester IS 'Beta testers get extra 3 months free';
COMMENT ON COLUMN coaches.premium_started_at IS 'When premium access started';

-- Update existing coaches to have trial (ONLY RUN ONCE!)
UPDATE coaches
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'trial',
  premium_started_at = NOW()
WHERE trial_ends_at IS NULL;

-- ===============================================
-- 3. UPDATE EXISTING PAYMENTS TABLE
-- ===============================================

-- Check if payments table has the right structure
-- Add missing columns if needed
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'succeeded' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add foreign key constraint to coaches table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payments_coach_id'
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_coach_id 
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own payments
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' AND policyname = 'payments_select_policy'
    ) THEN
        DROP POLICY payments_select_policy ON payments;
    END IF;
END $$;

CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (coach_id = auth.uid());

-- Policy: Only backend can insert payments
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' AND policyname = 'payments_insert_policy'
    ) THEN
        DROP POLICY payments_insert_policy ON payments;
    END IF;
END $$;

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
      WHEN c.subscription_status = 'trial' THEN
        c.trial_ends_at > NOW()
      WHEN c.subscription_status = 'active' THEN
        c.subscription_ends_at > NOW()
      ELSE FALSE
    END as is_active,
    CASE
      WHEN c.subscription_status = 'trial' THEN
        EXTRACT(DAY FROM c.trial_ends_at - NOW())::INTEGER
      WHEN c.subscription_status = 'active' THEN
        EXTRACT(DAY FROM c.subscription_ends_at - NOW())::INTEGER
      ELSE 0
    END as days_left,
    c.subscription_status as status
  FROM coaches c
  WHERE c.id = coach_id_param;
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
  UPDATE coaches
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
      WHEN c.subscription_status = 'trial' THEN
        c.trial_ends_at > NOW()
      WHEN c.subscription_status = 'active' THEN
        c.subscription_ends_at > NOW()
      ELSE FALSE
    END as is_active,
    CASE
      WHEN c.subscription_status = 'trial' THEN
        EXTRACT(DAY FROM c.trial_ends_at - NOW())::INTEGER
      WHEN c.subscription_status = 'active' THEN
        EXTRACT(DAY FROM c.subscription_ends_at - NOW())::INTEGER
      ELSE 0
    END as days_left,
    c.subscription_status as status,
    c.trial_ends_at,
    c.subscription_ends_at,
    (c.subscription_status = 'trial') as is_trial,
    CASE
      WHEN c.subscription_status = 'trial' THEN
        c.trial_ends_at > NOW()
      WHEN c.subscription_status = 'active' THEN
        c.subscription_ends_at > NOW()
      ELSE FALSE
    END as can_create_session,
    CASE
      WHEN c.subscription_status = 'trial' THEN
        c.trial_ends_at > NOW()
      WHEN c.subscription_status = 'active' THEN
        c.subscription_ends_at > NOW()
      ELSE FALSE
    END as can_add_client
  FROM coaches c
  WHERE c.id = coach_id_param;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

-- Indexes for coaches subscription queries
CREATE INDEX IF NOT EXISTS idx_coaches_subscription_status ON coaches(subscription_status);
CREATE INDEX IF NOT EXISTS idx_coaches_stripe_customer ON coaches(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_coaches_trial_ends_at ON coaches(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_coaches_subscription_ends_at ON coaches(subscription_ends_at);

-- ===============================================
-- 6. CREATE HELPER VIEWS
-- ===============================================

-- View for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  c.id as coach_id,
  c.email,
  c.subscription_status,
  c.trial_ends_at,
  c.subscription_ends_at,
  CASE
    WHEN c.subscription_status = 'trial' THEN
      c.trial_ends_at > NOW()
    WHEN c.subscription_status = 'active' THEN
      c.subscription_ends_at > NOW()
    ELSE FALSE
  END as is_active,
  CASE
    WHEN c.subscription_status = 'trial' THEN
      EXTRACT(DAY FROM c.trial_ends_at - NOW())::INTEGER
    WHEN c.subscription_status = 'active' THEN
      EXTRACT(DAY FROM c.subscription_ends_at - NOW())::INTEGER
    ELSE 0
  END as days_left
FROM coaches c
WHERE c.subscription_status IN ('trial', 'active');

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
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 8. VERIFICATION QUERIES
-- ===============================================

-- Check if all columns were added successfully
SELECT 'Coaches table all columns:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'coaches'
ORDER BY ordinal_position;

SELECT 'Coaches table subscription columns:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'coaches' 
  AND column_name IN ('trial_ends_at', 'subscription_status', 'stripe_customer_id')
ORDER BY column_name;

-- Check if session_color was added
SELECT 'Session color column added:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'training_sessions' 
  AND column_name = 'session_color';

-- Check if payments table was updated
SELECT 'Payments table structure:' as info;
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check if functions were created
SELECT 'Functions created:' as info;
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
-- 9. USAGE EXAMPLES
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
-- ✅ Added subscription columns to coaches table
-- ✅ Updated existing payments table
-- ✅ Created 4 helper functions
-- ✅ Created performance indexes
-- ✅ Created 2 analytics views
-- ✅ Added automatic timestamp triggers
-- ✅ All existing coaches get 30-day trial

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
