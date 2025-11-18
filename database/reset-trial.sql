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

