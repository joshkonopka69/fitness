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

-- 6. View active subscriptions
SELECT * FROM active_subscriptions;

-- 7. Check revenue analytics
SELECT * FROM revenue_analytics;
