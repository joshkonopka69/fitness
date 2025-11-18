-- Fix duplicate activate_subscription function
-- This script removes the duplicate and keeps only one version

-- 1. Drop all versions of activate_subscription
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, text, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, varchar, integer);

-- 2. Create the correct version (using TEXT which is more standard)
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
  -- Update coach subscription status
  UPDATE public.coaches
  SET 
    subscription_status = 'active',
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_coach_id;

  -- Log the activation
  RAISE NOTICE 'Subscription activated for coach % until %', 
    p_coach_id, 
    NOW() + (p_duration_months || ' months')::INTERVAL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO anon;

-- Verify the function was created
SELECT 
  routine_name,
  data_type,
  parameter_name,
  ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'activate_subscription'
ORDER BY ordinal_position;

