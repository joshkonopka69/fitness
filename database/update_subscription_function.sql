-- Update activate_subscription function to accept duration_months

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
