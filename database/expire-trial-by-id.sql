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

