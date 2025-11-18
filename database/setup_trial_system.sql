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

