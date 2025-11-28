-- ============================================
-- COMPLETE DATABASE MIGRATION FOR FITNESS PROJECT
-- ============================================
-- This includes ALL features from attendanceapp
-- Run this AFTER the basic schema setup
-- Project: fitness (bhqtxqecpyoscfrneyjf)
-- ============================================

-- ============================================
-- PART 1: ADD SUBSCRIPTION & TRIAL COLUMNS TO COACHES
-- ============================================

-- Add subscription and trial columns
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN coaches.trial_ends_at IS '30-day free trial end date (set on signup)';
COMMENT ON COLUMN coaches.subscription_status IS 'trial, active, expired, or cancelled';
COMMENT ON COLUMN coaches.subscription_ends_at IS 'When paid subscription expires';
COMMENT ON COLUMN coaches.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN coaches.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN coaches.beta_tester IS 'Beta testers get extra time';
COMMENT ON COLUMN coaches.premium_started_at IS 'When premium access started';

-- Create indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_coaches_subscription_status ON coaches(subscription_status);
CREATE INDEX IF NOT EXISTS idx_coaches_stripe_customer ON coaches(stripe_customer_id);

-- ============================================
-- PART 2: CREATE PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PLN',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  payment_method VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;

-- Policies for payments
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT WITH CHECK (coach_id = auth.uid());

-- ============================================
-- PART 3: CREATE CLIENT CATEGORIES SYSTEM
-- ============================================

-- Main categories table
CREATE TABLE IF NOT EXISTS client_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  parent_category_id UUID REFERENCES client_categories(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT '📍',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category assignments (Many-to-Many)
CREATE TABLE IF NOT EXISTS client_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES client_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, category_id)
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_coach ON client_categories(coach_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON client_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_category_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON client_category_assignments(category_id);

-- Enable RLS for categories
ALTER TABLE client_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_category_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can insert own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can update own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can delete own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can view own assignments" ON client_category_assignments;
DROP POLICY IF EXISTS "Coaches can insert own assignments" ON client_category_assignments;
DROP POLICY IF EXISTS "Coaches can delete own assignments" ON client_category_assignments;

-- Policies for categories
CREATE POLICY "Coaches can view own categories" ON client_categories
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own categories" ON client_categories
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own categories" ON client_categories
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own categories" ON client_categories
  FOR DELETE USING (auth.uid() = coach_id);

-- Policies for category assignments
CREATE POLICY "Coaches can view own assignments" ON client_category_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own assignments" ON client_category_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own assignments" ON client_category_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- ============================================
-- PART 4: FUNCTIONS FOR TRIAL & SUBSCRIPTION
-- ============================================

-- Function: Initialize trial on signup
CREATE OR REPLACE FUNCTION initialize_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.trial_ends_at := NOW() + INTERVAL '30 days';
  NEW.subscription_status := 'trial';
  NEW.premium_started_at := NOW();
  RAISE NOTICE 'Trial initialized for user %: ends at %', NEW.id, NEW.trial_ends_at;
  RETURN NEW;
END;
$$;

-- Trigger: Set trial on signup
DROP TRIGGER IF EXISTS set_trial_on_signup ON coaches;
CREATE TRIGGER set_trial_on_signup
  BEFORE INSERT ON coaches
  FOR EACH ROW
  EXECUTE FUNCTION initialize_trial();

-- Function: Check if trial/subscription is active
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

  RETURN FALSE;
END;
$$;

-- Function: Get trial/subscription info
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

-- Function: Record payment
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

-- Function: Activate subscription after payment
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

-- ============================================
-- PART 5: VIEWS
-- ============================================

-- View: Categories with client count
CREATE OR REPLACE VIEW categories_with_client_count AS
SELECT 
  cc.*,
  COUNT(cca.client_id) as client_count
FROM client_categories cc
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
GROUP BY cc.id;

-- ============================================
-- PART 6: TRIGGERS FOR UPDATED_AT
-- ============================================

-- Trigger for payments updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for categories updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON client_categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON client_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 7: UPDATE EXISTING USERS (IF ANY)
-- ============================================

-- Give existing coaches a trial if they don't have one
UPDATE coaches
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'trial',
  premium_started_at = NOW()
WHERE trial_ends_at IS NULL OR subscription_status IS NULL;

-- ============================================
-- MIGRATION COMPLETE! ✅
-- ============================================
-- Your database now has:
-- ✅ Basic schema (coaches, clients, sessions, attendance, payments)
-- ✅ Trial system (30-day free trial for new users)
-- ✅ Subscription system (Stripe integration)
-- ✅ Payment tracking
-- ✅ Client categories (organize by location/groups)
-- ✅ All views, functions, and triggers
-- ✅ Row Level Security policies
-- ============================================

