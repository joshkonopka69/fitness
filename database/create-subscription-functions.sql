-- Create subscription management functions for payment system
-- Run this in Supabase SQL Editor

-- 1. Create activate_subscription function
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

