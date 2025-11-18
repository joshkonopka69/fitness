-- Check your account details
-- Run this first to see your actual email and trial status

SELECT 
  id,
  email,
  subscription_status,
  trial_ends_at,
  CASE 
    WHEN trial_ends_at > NOW() THEN EXTRACT(DAY FROM trial_ends_at - NOW())
    ELSE 0
  END as days_remaining
FROM coaches
ORDER BY created_at DESC
LIMIT 10;

