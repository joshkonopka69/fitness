-- Create the get_trial_info RPC function
-- This function returns trial status for a coach

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
    c.subscription_status as status,
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

