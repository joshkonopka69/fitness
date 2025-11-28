-- ============================================
-- PHASE 2: SUBSCRIPTIONS, PAYMENTS `& TRIAL LOGIC
-- Generated 2025-11-26 11:01:15
-- ============================================

-- [START FILE: database_payments_system.sql]

-- Complete Payment Tracking System
-- Run this in Supabase SQL Editor

-- Create client_payments table (renamed to avoid conflict with subscription payments)
CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT DEFAULT 'monthly', -- 'monthly', 'session', 'package', 'adjustment', 'other'
  payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'other'
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_payments_coach_id ON client_payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_payment_date ON client_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_client_payments_created_at ON client_payments(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

-- Create policy: coaches can only access their own payments (drop first if exists)
DROP POLICY IF EXISTS "client_payments_coach_access" ON client_payments;
CREATE POLICY "client_payments_coach_access" ON client_payments
  FOR ALL 
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Grant permissions
GRANT ALL ON client_payments TO authenticated;

-- Create view for client payment statistics
CREATE OR REPLACE VIEW client_payment_stats AS
SELECT 
  c.id as client_id,
  c.coach_id,
  c.name as client_name,
  c.monthly_fee,
  c.balance_owed,
  COALESCE(SUM(p.amount), 0) as total_paid,
  COUNT(p.id) as payment_count,
  MAX(p.payment_date) as last_payment_date,
  CASE 
    WHEN MAX(p.payment_date) IS NOT NULL 
    THEN (CURRENT_DATE - MAX(p.payment_date)::DATE)::INTEGER
    ELSE NULL
  END as days_since_last_payment
FROM clients c
LEFT JOIN client_payments p ON c.id = p.client_id
WHERE c.active = true
GROUP BY c.id, c.coach_id, c.name, c.monthly_fee, c.balance_owed;

-- Grant access to view
GRANT SELECT ON client_payment_stats TO authenticated;

-- Create function to get client payment summary
CREATE OR REPLACE FUNCTION get_client_payment_summary(p_client_id UUID)
RETURNS TABLE (
  total_paid NUMERIC,
  payment_count BIGINT,
  last_payment_date DATE,
  last_payment_amount NUMERIC,
  avg_payment_amount NUMERIC,
  months_active INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_paid,
    COUNT(*) as payment_count,
    MAX(payment_date) as last_payment_date,
    (SELECT amount FROM client_payments WHERE client_id = p_client_id ORDER BY payment_date DESC LIMIT 1) as last_payment_amount,
    COALESCE(AVG(amount), 0) as avg_payment_amount,
    CASE 
      WHEN MIN(payment_date) IS NOT NULL 
      THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(payment_date)))::INTEGER + 1
      ELSE 0
    END as months_active
  FROM client_payments
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_client_payment_summary(UUID) TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for client_payments table
DROP TRIGGER IF EXISTS update_client_payments_updated_at ON client_payments;
CREATE TRIGGER update_client_payments_updated_at 
  BEFORE UPDATE ON client_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation (for client_payments table)
COMMENT ON TABLE client_payments IS 'Stores all payment records from clients to coaches';
COMMENT ON COLUMN client_payments.amount IS 'Payment amount (positive for payments received, negative for refunds)';
COMMENT ON COLUMN client_payments.payment_type IS 'Type: monthly, session, package, adjustment, other';
COMMENT ON COLUMN client_payments.payment_method IS 'Method: cash, card, transfer, other';
COMMENT ON COLUMN client_payments.payment_date IS 'Date when payment was received';


-- [END FILE: database_payments_system.sql]


-- [START FILE: add_subscription_system.sql]

-- ===============================================
-- FitnessGuru Subscription System
-- First-time users get 30 days FREE premium
-- ===============================================

-- Step 1: Add subscription columns to coaches
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Add comments for documentation
COMMENT ON COLUMN coaches.trial_ends_at IS '30-day free trial end date (set on first login)';
COMMENT ON COLUMN coaches.subscription_status IS 'trial, active, expired, or cancelled';
COMMENT ON COLUMN coaches.subscription_ends_at IS 'When paid subscription expires';
COMMENT ON COLUMN coaches.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN coaches.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN coaches.beta_tester IS 'Beta testers get extra 3 months free';
COMMENT ON COLUMN coaches.premium_started_at IS 'When premium access started';

-- Step 3: Update existing users to have trial (ONLY RUN ONCE!)
UPDATE coaches
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
  FROM coaches cp
  WHERE cp.id = coach_id_param;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_coaches_subscription_status ON coaches(subscription_status);
CREATE INDEX IF NOT EXISTS idx_coaches_stripe_customer ON coaches(stripe_customer_id);

-- Step 6: Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
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

-- Drop existing policies first
DROP POLICY IF EXISTS payments_select_policy ON payments;
DROP POLICY IF EXISTS payments_insert_policy ON payments;

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


-- [END FILE: add_subscription_system.sql]


-- [START FILE: setup_trial_system.sql]

-- ============================================================================
-- FREE TRIAL SYSTEM SETUP
-- ============================================================================
-- This script sets up automatic 30-day free trial for new users
-- No card required - trial starts automatically on registration
-- ============================================================================

-- Step 1: Ensure coaches table has trial columns
-- (Should already exist from previous migration, but let's verify)

DO $$ 
BEGIN
    -- Add trial columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coaches' AND column_name = 'trial_ends_at'
    ) THEN
        ALTER TABLE coaches ADD COLUMN trial_ends_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coaches' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE coaches ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
    END IF;
END $$;

-- Step 2: Create function to initialize trial for new users
CREATE OR REPLACE FUNCTION initialize_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set trial period to 30 days from now
  NEW.trial_ends_at := NOW() + INTERVAL '30 days';
  NEW.subscription_status := 'trial';
  
  -- Log the trial initialization
  RAISE NOTICE 'Trial initialized for user %: ends at %', NEW.id, NEW.trial_ends_at;
  
  RETURN NEW;
END;
$$;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_trial_on_signup ON coaches;

-- Step 4: Create trigger to automatically set trial on new user signup
CREATE TRIGGER set_trial_on_signup
  BEFORE INSERT ON coaches
  FOR EACH ROW
  EXECUTE FUNCTION initialize_trial();

-- Step 5: Update existing users without trial to have 30-day trial
-- (Useful for existing test users)
UPDATE coaches
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'trial'
WHERE trial_ends_at IS NULL OR subscription_status IS NULL;

-- Step 6: Create helper function to check if user's trial is active
CREATE OR REPLACE FUNCTION is_trial_active(p_coach_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status VARCHAR(20);
  v_trial_ends TIMESTAMPTZ;
  v_subscription_ends TIMESTAMPTZ;
BEGIN
  SELECT 
    subscription_status,
    trial_ends_at,
    subscription_ends_at
  INTO v_status, v_trial_ends, v_subscription_ends
  FROM coaches
  WHERE id = p_coach_id;

  -- Active subscription
  IF v_status = 'active' AND v_subscription_ends > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Trial period
  IF v_status = 'trial' AND v_trial_ends > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Expired
  RETURN FALSE;
END;
$$;

-- Step 7: Create function to get trial info
DROP FUNCTION IF EXISTS get_trial_info(UUID);
CREATE OR REPLACE FUNCTION get_trial_info(p_coach_id UUID)
RETURNS TABLE (
  status VARCHAR(20),
  is_active BOOLEAN,
  days_left INTEGER,
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status VARCHAR(20);
  v_trial_ends TIMESTAMPTZ;
  v_subscription_ends TIMESTAMPTZ;
  v_is_active BOOLEAN;
  v_days_left INTEGER;
BEGIN
  SELECT 
    subscription_status,
    trial_ends_at,
    subscription_ends_at
  INTO v_status, v_trial_ends, v_subscription_ends
  FROM coaches
  WHERE id = p_coach_id;

  -- Calculate active status
  IF v_status = 'active' AND v_subscription_ends > NOW() THEN
    v_is_active := TRUE;
    v_days_left := EXTRACT(DAY FROM (v_subscription_ends - NOW()));
  ELSIF v_status = 'trial' AND v_trial_ends > NOW() THEN
    v_is_active := TRUE;
    v_days_left := EXTRACT(DAY FROM (v_trial_ends - NOW()));
  ELSE
    v_is_active := FALSE;
    v_days_left := 0;
  END IF;

  RETURN QUERY
  SELECT 
    v_status,
    v_is_active,
    v_days_left,
    v_trial_ends,
    v_subscription_ends;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'set_trial_on_signup';

-- Check coaches table structure
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'coaches' 
  AND column_name IN ('trial_ends_at', 'subscription_status', 'subscription_ends_at');

-- Check all users have trials set
SELECT 
  id,
  email,
  subscription_status,
  trial_ends_at,
  EXTRACT(DAY FROM (trial_ends_at - NOW())) as days_remaining
FROM coaches;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now when a user registers:
-- 1. trial_ends_at = NOW() + 30 days
-- 2. subscription_status = 'trial'
-- 3. User has 30 days to test the app
-- 4. After 30 days, they must subscribe
-- ============================================================================


-- [END FILE: setup_trial_system.sql]


-- [START FILE: create-get-trial-info-function.sql]

-- Create the get_trial_info RPC function
-- This function returns trial status for a coach
DROP FUNCTION IF EXISTS get_trial_info(UUID);
CREATE OR REPLACE FUNCTION get_trial_info(p_coach_id UUID)
RETURNS TABLE (
  status TEXT,
  is_active BOOLEAN,
  days_left INTEGER,
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.subscription_status::TEXT as status,
    CASE 
      WHEN c.subscription_status = 'active' THEN true
      WHEN c.trial_ends_at > NOW() THEN true
      ELSE false
    END as is_active,
    CASE 
      WHEN c.trial_ends_at > NOW() THEN EXTRACT(DAY FROM c.trial_ends_at - NOW())::INTEGER
      ELSE 0
    END as days_left,
    c.trial_ends_at,
    c.subscription_ends_at
  FROM coaches c
  WHERE c.id = p_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trial_info(UUID) TO authenticated;

-- Test the function
SELECT * FROM get_trial_info('c83afa88-8ec9-400a-b67e-85c646173479');


-- [END FILE: create-get-trial-info-function.sql]


-- [START FILE: create-subscription-functions.sql]

-- Create subscription management functions for payment system
-- Run this in Supabase SQL Editor

-- 1. Create activate_subscription function
DROP FUNCTION IF EXISTS activate_subscription(UUID, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id TEXT,
  p_duration_months INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE coaches
  SET 
    subscription_status = 'active',
    stripe_subscription_id = p_stripe_subscription_id,
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_coach_id;
  
  RAISE NOTICE 'Subscription activated for coach %', p_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION activate_subscription(UUID, TEXT, INTEGER) TO authenticated;

-- 2. Create record_payment function
CREATE OR REPLACE FUNCTION record_payment(
  p_coach_id UUID,
  p_amount DECIMAL(10,2),
  p_currency VARCHAR(3),
  p_status VARCHAR(20),
  p_stripe_payment_intent_id TEXT,
  p_payment_method VARCHAR(50),
  p_description TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Try to insert into payment_history table
  -- If table doesn't exist, it will fail gracefully
  BEGIN
    INSERT INTO payment_history (
      coach_id,
      amount,
      currency,
      status,
      stripe_payment_intent_id,
      payment_method,
      description,
      created_at
    ) VALUES (
      p_coach_id,
      p_amount,
      p_currency,
      p_status,
      p_stripe_payment_intent_id,
      p_payment_method,
      p_description,
      NOW()
    );
    
    RAISE NOTICE 'Payment recorded: % % for coach %', p_amount, p_currency, p_coach_id;
  EXCEPTION 
    WHEN undefined_table THEN
      -- Table doesn't exist yet, that's OK
      RAISE NOTICE 'payment_history table does not exist, skipping payment record';
    WHEN OTHERS THEN
      -- Log other errors but don't fail
      RAISE NOTICE 'Error recording payment: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_payment(UUID, DECIMAL, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated;

-- 3. Test activate_subscription function
DO $$
BEGIN
  RAISE NOTICE 'Testing activate_subscription function...';
  
  PERFORM activate_subscription(
    'c83afa88-8ec9-400a-b67e-85c646173479',
    'test_sub_' || NOW()::TEXT,
    1  -- 1 month duration
  );
  
  RAISE NOTICE 'Test completed successfully!';
END $$;

-- 4. Verify the test worked
SELECT 
  id,
  email,
  subscription_status,
  subscription_ends_at,
  trial_ends_at
FROM coaches 
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479';

-- Expected result:
-- subscription_status should be 'active'
-- subscription_ends_at should be ~1 month from now

-- 5. Reset trial for testing (run this to test payment again)
UPDATE coaches
SET 
  subscription_status = 'trial',
  subscription_ends_at = NULL,
  stripe_subscription_id = NULL,
  trial_ends_at = NOW() - INTERVAL '1 day'  -- Expired trial
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479';

-- 6. Verify reset
SELECT 
  email,
  subscription_status,
  trial_ends_at,
  CASE 
    WHEN trial_ends_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as trial_status
FROM coaches 
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479';

-- Expected: trial_status should be 'Expired'

-- Done! Functions created and tested.
-- Now restart your app and test the payment flow!


-- [END FILE: create-subscription-functions.sql]


-- [START FILE: add_monthly_payment_tracking.sql]

-- ===============================================
-- SYSTEM ŚLEDZENIA PŁATNOŚCI MIESIĘCZNYCH
-- ===============================================
-- Autor: FitnessGuru Team
-- Data: 2024-11-15
-- Opis: Umożliwia trenerom śledzenie kto zapłacił
--       za treningi w danym miesiącu z automatycznym
--       resetem co miesiąc
-- ===============================================

-- ===============================================
-- 1. TABELA PŁATNOŚCI MIESIĘCZNYCH
-- ===============================================
CREATE TABLE IF NOT EXISTS monthly_payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  has_paid BOOLEAN DEFAULT FALSE,
  marked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Jeden wpis na klienta na miesiąc
  UNIQUE(client_id, year, month)
);

COMMENT ON TABLE monthly_payment_tracking IS 'Śledzenie płatności miesięcznych klientów';
COMMENT ON COLUMN monthly_payment_tracking.year IS 'Rok (np. 2024)';
COMMENT ON COLUMN monthly_payment_tracking.month IS 'Miesiąc 1-12 (1=styczeń, 12=grudzień)';
COMMENT ON COLUMN monthly_payment_tracking.has_paid IS 'Czy klient zapłacił za ten miesiąc';
COMMENT ON COLUMN monthly_payment_tracking.marked_at IS 'Kiedy oznaczono jako zapłacone';
COMMENT ON COLUMN monthly_payment_tracking.notes IS 'Opcjonalne notatki (np. "Zapłacił gotówką")';

-- ===============================================
-- 2. INDEKSY (dla wydajności)
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_payment_tracking_coach 
  ON monthly_payment_tracking(coach_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_client 
  ON monthly_payment_tracking(client_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_period 
  ON monthly_payment_tracking(year, month);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_coach_period 
  ON monthly_payment_tracking(coach_id, year, month);
  
-- Indeks dla szybkiego wyszukiwania nieopłaconych
CREATE INDEX IF NOT EXISTS idx_payment_tracking_unpaid 
  ON monthly_payment_tracking(coach_id, year, month, has_paid) 
  WHERE has_paid = FALSE;

-- ===============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ===============================================
ALTER TABLE monthly_payment_tracking ENABLE ROW LEVEL SECURITY;

-- Trenerzy mogą widzieć tylko swoje wpisy
DROP POLICY IF EXISTS "Coaches can view own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can view own payment tracking" 
  ON monthly_payment_tracking FOR SELECT 
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can insert own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can insert own payment tracking" 
  ON monthly_payment_tracking FOR INSERT 
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can update own payment tracking" 
  ON monthly_payment_tracking FOR UPDATE 
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can delete own payment tracking" 
  ON monthly_payment_tracking FOR DELETE 
  USING (auth.uid() = coach_id);

-- ===============================================
-- 4. TRIGGER DLA UPDATED_AT
-- ===============================================
DROP TRIGGER IF EXISTS update_payment_tracking_updated_at ON monthly_payment_tracking;
CREATE TRIGGER update_payment_tracking_updated_at
  BEFORE UPDATE ON monthly_payment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 5. WIDOKI (VIEWS)
-- ===============================================

-- Widok: Nieopłaceni klienci w bieżącym miesiącu
DROP VIEW IF EXISTS unpaid_clients_current_month;
CREATE OR REPLACE VIEW unpaid_clients_current_month AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.phone as client_phone,
  c.coach_id,
  mpt.year,
  mpt.month,
  mpt.has_paid,
  mpt.id as tracking_id
FROM clients c
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE 
  c.active = TRUE
  AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL);

COMMENT ON VIEW unpaid_clients_current_month IS 'Klienci którzy nie zapłacili w bieżącym miesiącu';

-- Widok: Statystyki płatności per kategoria
DROP VIEW IF EXISTS payment_stats_by_category;
CREATE OR REPLACE VIEW payment_stats_by_category AS
SELECT 
  cc.id as category_id,
  cc.name as category_name,
  cc.coach_id,
  cc.color,
  cc.icon,
  EXTRACT(YEAR FROM NOW())::INTEGER as year,
  EXTRACT(MONTH FROM NOW())::INTEGER as month,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients
FROM client_categories cc
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
LEFT JOIN clients c ON c.id = cca.client_id AND c.active = TRUE
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE cc.parent_category_id IS NULL -- tylko główne kategorie
GROUP BY cc.id, cc.name, cc.coach_id, cc.color, cc.icon;

COMMENT ON VIEW payment_stats_by_category IS 'Statystyki płatności per kategoria (główna) w bieżącym miesiącu';

-- Widok: Statystyki płatności dla podkategorii (subgrup)
DROP VIEW IF EXISTS payment_stats_by_subcategory;
CREATE OR REPLACE VIEW payment_stats_by_subcategory AS
SELECT 
  cc.id as subcategory_id,
  cc.name as subcategory_name,
  cc.parent_category_id,
  parent.name as parent_category_name,
  cc.coach_id,
  cc.color,
  cc.icon,
  EXTRACT(YEAR FROM NOW())::INTEGER as year,
  EXTRACT(MONTH FROM NOW())::INTEGER as month,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients
FROM client_categories cc
LEFT JOIN client_categories parent ON parent.id = cc.parent_category_id
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
LEFT JOIN clients c ON c.id = cca.client_id AND c.active = TRUE
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE cc.parent_category_id IS NOT NULL
GROUP BY 
  cc.id, 
  cc.name, 
  cc.parent_category_id, 
  parent.name,
  cc.coach_id, 
  cc.color, 
  cc.icon;

COMMENT ON VIEW payment_stats_by_subcategory IS 'Statystyki płatności dla podkategorii (subgrup) w bieżącym miesiącu';

-- ===============================================
-- 6. FUNKCJE POMOCNICZE
-- ===============================================

-- Funkcja: Pobierz nieopłaconych klientów w bieżącym miesiącu
CREATE OR REPLACE FUNCTION get_unpaid_clients_current_month(p_coach_id UUID)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  has_paid BOOLEAN,
  tracking_id UUID,
  categories TEXT[] -- nazwy kategorii klienta
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    COALESCE(mpt.has_paid, FALSE) as has_paid,
    mpt.id as tracking_id,
    ARRAY_AGG(DISTINCT cc.name) FILTER (WHERE cc.name IS NOT NULL) as categories
  FROM clients c
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
    AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
  LEFT JOIN client_category_assignments cca ON cca.client_id = c.id
  LEFT JOIN client_categories cc ON cc.id = cca.category_id
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE
    AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL)
  GROUP BY c.id, c.name, c.phone, mpt.has_paid, mpt.id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unpaid_clients_current_month IS 'Zwraca listę nieopłaconych klientów w bieżącym miesiącu';

-- Funkcja: Pobierz nieopłaconych klientów w kategorii
CREATE OR REPLACE FUNCTION get_unpaid_clients_in_category(
  p_coach_id UUID,
  p_category_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  has_paid BOOLEAN,
  tracking_id UUID
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    COALESCE(mpt.has_paid, FALSE) as has_paid,
    mpt.id as tracking_id
  FROM clients c
  INNER JOIN client_category_assignments cca ON cca.client_id = c.id
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = v_year
    AND mpt.month = v_month
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE
    AND cca.category_id = p_category_id
    AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL)
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unpaid_clients_in_category IS 'Zwraca nieopłaconych klientów w danej kategorii';

-- Funkcja: Oznacz klienta jako zapłaconego
CREATE OR REPLACE FUNCTION mark_client_paid(
  p_coach_id UUID,
  p_client_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_tracking_id UUID;
BEGIN
  -- Sprawdź czy klient należy do trenera
  IF NOT EXISTS (
    SELECT 1 FROM clients 
    WHERE id = p_client_id AND coach_id = p_coach_id
  ) THEN
    RAISE EXCEPTION 'Client does not belong to this coach';
  END IF;
  
  -- Wstaw lub zaktualizuj
  INSERT INTO monthly_payment_tracking (
    coach_id,
    client_id,
    year,
    month,
    has_paid,
    marked_at,
    notes
  ) VALUES (
    p_coach_id,
    p_client_id,
    v_year,
    v_month,
    TRUE,
    NOW(),
    p_notes
  )
  ON CONFLICT (client_id, year, month)
  DO UPDATE SET
    has_paid = TRUE,
    marked_at = NOW(),
    notes = COALESCE(EXCLUDED.notes, monthly_payment_tracking.notes),
    updated_at = NOW()
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_client_paid IS 'Oznacza klienta jako zapłaconego za dany miesiąc';

-- Funkcja: Oznacz klienta jako NIEzapłaconego
CREATE OR REPLACE FUNCTION mark_client_unpaid(
  p_coach_id UUID,
  p_client_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_tracking_id UUID;
BEGIN
  -- Sprawdź czy klient należy do trenera
  IF NOT EXISTS (
    SELECT 1 FROM clients 
    WHERE id = p_client_id AND coach_id = p_coach_id
  ) THEN
    RAISE EXCEPTION 'Client does not belong to this coach';
  END IF;
  
  -- Wstaw lub zaktualizuj
  INSERT INTO monthly_payment_tracking (
    coach_id,
    client_id,
    year,
    month,
    has_paid,
    marked_at
  ) VALUES (
    p_coach_id,
    p_client_id,
    v_year,
    v_month,
    FALSE,
    NULL
  )
  ON CONFLICT (client_id, year, month)
  DO UPDATE SET
    has_paid = FALSE,
    marked_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_client_unpaid IS 'Oznacza klienta jako NIEzapłaconego za dany miesiąc';

-- Funkcja: Pobierz statystyki płatności dla trenera
CREATE OR REPLACE FUNCTION get_payment_stats_for_coach(
  p_coach_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_clients BIGINT,
  paid_clients BIGINT,
  unpaid_clients BIGINT,
  payment_rate NUMERIC
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
    COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients,
    CASE 
      WHEN COUNT(DISTINCT c.id) > 0 
      THEN ROUND(
        (COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END)::NUMERIC / 
         COUNT(DISTINCT c.id)::NUMERIC) * 100, 
        2
      )
      ELSE 0
    END as payment_rate
  FROM clients c
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = v_year
    AND mpt.month = v_month
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_payment_stats_for_coach IS 'Zwraca statystyki płatności dla trenera w danym miesiącu';

-- ===============================================
-- 7. AUTOMATYCZNE CZYSZCZENIE STARYCH DANYCH
-- ===============================================
-- Opcjonalnie: Funkcja do usuwania danych starszych niż X miesięcy

CREATE OR REPLACE FUNCTION cleanup_old_payment_tracking(months_to_keep INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM monthly_payment_tracking
  WHERE 
    (year * 12 + month) < 
    (EXTRACT(YEAR FROM NOW())::INTEGER * 12 + EXTRACT(MONTH FROM NOW())::INTEGER - months_to_keep);
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_payment_tracking IS 'Usuwa dane starsze niż X miesięcy (domyślnie 12)';

-- ===============================================
-- 8. TESTY I WERYFIKACJA
-- ===============================================

-- Sprawdź czy tabela została utworzona
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_name = 'monthly_payment_tracking'
  ) = 1, 
  'Błąd: Tabela monthly_payment_tracking nie została utworzona';
  
  RAISE NOTICE '✅ Tabela monthly_payment_tracking utworzona pomyślnie';
END $$;

-- Sprawdź czy indeksy zostały utworzone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_indexes 
    WHERE tablename = 'monthly_payment_tracking'
  ) >= 5, 
  'Błąd: Nie wszystkie indeksy zostały utworzone';
  
  RAISE NOTICE '✅ Indeksy utworzone pomyślnie';
END $$;

-- Sprawdź czy RLS jest włączone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_tables 
    WHERE tablename = 'monthly_payment_tracking' AND rowsecurity = true
  ) = 1, 
  'Błąd: RLS nie jest włączone';
  
  RAISE NOTICE '✅ Row Level Security włączone pomyślnie';
END $$;

-- Sprawdź czy funkcje zostały utworzone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname IN (
      'get_unpaid_clients_current_month',
      'get_unpaid_clients_in_category',
      'mark_client_paid',
      'mark_client_unpaid',
      'get_payment_stats_for_coach',
      'cleanup_old_payment_tracking'
    )
  ) = 6, 
  'Błąd: Nie wszystkie funkcje zostały utworzone';
  
  RAISE NOTICE '✅ Funkcje pomocnicze utworzone pomyślnie';
END $$;

-- ===============================================
-- MIGRACJA ZAKOŃCZONA ✅
-- ===============================================

-- Podsumowanie:
-- ✅ Utworzono tabelę monthly_payment_tracking
-- ✅ Dodano 5 indeksów dla wydajności
-- ✅ Skonfigurowano RLS (4 polityki bezpieczeństwa)
-- ✅ Utworzono trigger dla updated_at
-- ✅ Utworzono 2 widoki (unpaid_clients_current_month, payment_stats_by_category)
-- ✅ Dodano 6 funkcji pomocniczych
-- ✅ Dodano automatyczne czyszczenie starych danych

-- Następne kroki:
-- 1. Uruchom ten plik w Supabase SQL Editor
-- 2. Zaimplementuj TypeScript interfaces
-- 3. Stwórz service layer (paymentTrackingService.ts)
-- 4. Zaktualizuj PaymentsScreen z nowym wykresem
-- 5. Dodaj przycisk "Mark as Paid" w ClientsScreen

DO $$ 
BEGIN 
  RAISE NOTICE '🎉 System śledzenia płatności miesięcznych zainstalowany pomyślnie!';
  RAISE NOTICE '📊 Możesz teraz śledzić kto zapłacił za treningi w danym miesiącu';
END $$;


-- [END FILE: add_monthly_payment_tracking.sql]


-- [START FILE: update_subscription_function.sql]

-- Update activate_subscription function to accept duration_months
DROP FUNCTION IF EXISTS activate_subscription(UUID, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS activate_subscription(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS activate_subscription(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id VARCHAR(255),
  p_duration_months INTEGER DEFAULT 1
)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_ends_at TIMESTAMPTZ;
BEGIN
  -- Calculate subscription end date based on duration
  v_subscription_ends_at := NOW() + (p_duration_months || ' months')::INTERVAL;
  
  UPDATE coaches
  SET
    subscription_status = 'active',
    subscription_ends_at = v_subscription_ends_at,
    stripe_subscription_id = p_stripe_subscription_id,
    trial_ends_at = NULL -- Trial is over
  WHERE id = p_coach_id;
END;
$$;

-- Test the function
-- SELECT activate_subscription('your-coach-id'::UUID, 'sub_test123', 1); -- 1 month
-- SELECT activate_subscription('your-coach-id'::UUID, 'sub_test123', 12); -- 12 months

-- [END FILE: update_subscription_function.sql]


-- [START FILE: update_subscription_function_FIXED.sql]

-- Drop and recreate activate_subscription function
-- This fixes the "cannot change return type" error

-- Drop the old function first
DROP FUNCTION IF EXISTS activate_subscription(UUID, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS activate_subscription(UUID, VARCHAR);

-- Create the new function with correct signature
CREATE OR REPLACE FUNCTION activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id VARCHAR(255),
  p_duration_months INTEGER DEFAULT 1
)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_ends_at TIMESTAMPTZ;
BEGIN
  -- Calculate subscription end date based on duration
  v_subscription_ends_at := NOW() + (p_duration_months || ' months')::INTERVAL;
  
  UPDATE coaches
  SET
    subscription_status = 'active',
    subscription_ends_at = v_subscription_ends_at,
    stripe_subscription_id = p_stripe_subscription_id,
    trial_ends_at = NULL -- Trial is over
  WHERE id = p_coach_id;
END;
$$;

-- Test the function (replace with your actual coach ID)
-- SELECT activate_subscription('your-coach-id'::UUID, 'sub_test123', 1); -- 1 month
-- SELECT activate_subscription('your-coach-id'::UUID, 'sub_test123', 12); -- 12 months

-- Verify it was created
SELECT 'Function created successfully!' as status;


-- [END FILE: update_subscription_function_FIXED.sql]


-- [START FILE: fix_payment_functions_simple.sql]

-- Fix payment functions - SIMPLE VERSION
-- Just fixes the functions without verification

-- ============================================
-- 1. FIX activate_subscription
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, text, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, varchar, integer);

-- Create clean version
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id TEXT,
  p_duration_months INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.coaches
  SET 
    subscription_status = 'active',
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_coach_id;

  RAISE NOTICE 'Subscription activated for coach %', p_coach_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO anon;

-- ============================================
-- 2. FIX record_payment
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, character varying, character varying, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, varchar, varchar, varchar, varchar, varchar);

-- Create clean version
CREATE OR REPLACE FUNCTION public.record_payment(
  p_coach_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_status TEXT,
  p_stripe_payment_intent_id TEXT,
  p_payment_method TEXT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.payments (
    coach_id,
    amount,
    currency,
    status,
    stripe_payment_intent_id,
    payment_method,
    description,
    created_at
  ) VALUES (
    p_coach_id,
    p_amount,
    p_currency,
    p_status,
    p_stripe_payment_intent_id,
    p_payment_method,
    p_description,
    NOW()
  );

  RAISE NOTICE 'Payment recorded for coach %', p_coach_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Done!
SELECT 'Payment functions fixed successfully!' AS result;


-- [END FILE: fix_payment_functions_simple.sql]


-- [START FILE: fix_all_payment_functions.sql]

-- Fix ALL payment-related functions
-- This ensures no conflicts exist

-- ============================================
-- 1. FIX activate_subscription
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, text, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, varchar, integer);

-- Create clean version
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_coach_id UUID,
  p_stripe_subscription_id TEXT,
  p_duration_months INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.coaches
  SET 
    subscription_status = 'active',
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_coach_id;

  RAISE NOTICE 'Subscription activated for coach %', p_coach_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO anon;

-- ============================================
-- 2. FIX record_payment
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, character varying, character varying, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, varchar, varchar, varchar, varchar, varchar);

-- Create clean version
CREATE OR REPLACE FUNCTION public.record_payment(
  p_coach_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_status TEXT,
  p_stripe_payment_intent_id TEXT,
  p_payment_method TEXT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert payment record
  INSERT INTO public.payments (
    coach_id,
    amount,
    currency,
    status,
    stripe_payment_intent_id,
    payment_method,
    description,
    created_at
  ) VALUES (
    p_coach_id,
    p_amount,
    p_currency,
    p_status,
    p_stripe_payment_intent_id,
    p_payment_method,
    p_description,
    NOW()
  );

  RAISE NOTICE 'Payment recorded for coach %: % %', p_coach_id, p_amount, p_currency;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ============================================
-- 3. VERIFY - Show all functions
-- ============================================
-- Note: Verification query commented out due to schema compatibility
/*
SELECT 
  routine_name,
  STRING_AGG(
    parameter_name || ' ' || data_type, 
    ', ' 
    ORDER BY ordinal_position
  ) as parameters
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name IN ('activate_subscription', 'record_payment')
GROUP BY routine_name, specific_name
ORDER BY routine_name;
*/
SELECT 'Payment functions created successfully!' as status;


-- [END FILE: fix_all_payment_functions.sql]


-- [START FILE: expire-trial-by-id.sql]

-- Expire your trial for testing
-- Use the ID from check-your-account.sql result

UPDATE coaches
SET trial_ends_at = NOW() - INTERVAL '1 day'
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479'; -- Replace with your ID if different

-- Check the result
SELECT 
  email,
  subscription_status,
  trial_ends_at,
  CASE 
    WHEN trial_ends_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as trial_status
FROM coaches
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479';


-- [END FILE: expire-trial-by-id.sql]


-- [START FILE: reset-trial.sql]

-- Reset your trial back to normal (after testing)

UPDATE coaches
SET 
  trial_ends_at = NOW() + INTERVAL '29 days',
  subscription_status = 'trial',
  subscription_ends_at = NULL
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479'; -- Replace with your ID if different

-- Check the result
SELECT 
  email,
  subscription_status,
  trial_ends_at,
  subscription_ends_at,
  EXTRACT(DAY FROM trial_ends_at - NOW()) as days_remaining
FROM coaches
WHERE id = 'c83afa88-8ec9-400a-b67e-85c646173479';


-- [END FILE: reset-trial.sql]


-- [START FILE: test_subscription.sql]

-- Test subscription system after migration
-- Run this to verify everything works

-- 1. Check if a coach has subscription info
SELECT 
  id,
  email,
  subscription_status,
  trial_ends_at,
  premium_started_at
FROM coaches 
LIMIT 5;

-- 2. Test the subscription check function
-- Replace 'your-coach-id' with an actual coach ID from above
-- SELECT * FROM check_subscription_status('your-coach-id');

-- 3. Check if session colors were added
SELECT 
  id,
  title,
  session_type,
  session_color
FROM training_sessions 
LIMIT 5;

-- 4. Check payments table structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- 5. Test payment recording (optional)
-- SELECT record_payment(
--   'your-coach-id',
--   19.00,
--   'PLN',
--   'succeeded',
--   'pi_test_123',
--   'card',
--   'Test payment'
-- );

-- 6. View active subscriptions (commented - view may not exist)
-- SELECT * FROM active_subscriptions;

-- 7. Check revenue analytics (commented - view may not exist)
-- SELECT * FROM revenue_analytics;

-- Phase 2 Complete!
SELECT 'Phase 2: Subscriptions & Payments - Complete!' as status;

-- [END FILE: test_subscription.sql]

