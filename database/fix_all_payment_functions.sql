-- Fix ALL payment-related functions
-- This ensures no conflicts exist

-- ============================================
-- 1. FIX activate_subscription
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, text, integer);
DROP FUNCTION IF EXISTS public.activate_subscription(uuid, varchar, integer);

-- Create clean version
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
  UPDATE public.coaches
  SET 
    subscription_status = 'active',
    subscription_ends_at = NOW() + (p_duration_months || ' months')::INTERVAL,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_coach_id;

  RAISE NOTICE 'Subscription activated for coach %', p_coach_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER) TO anon;

-- ============================================
-- 2. FIX record_payment
-- ============================================

-- Drop all versions
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, character varying, character varying, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.record_payment(uuid, numeric, varchar, varchar, varchar, varchar, varchar);

-- Create clean version
CREATE OR REPLACE FUNCTION public.record_payment(
  p_coach_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_status TEXT,
  p_stripe_payment_intent_id TEXT,
  p_payment_method TEXT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert payment record
  INSERT INTO public.payments (
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

  RAISE NOTICE 'Payment recorded for coach %: % %', p_coach_id, p_amount, p_currency;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ============================================
-- 3. VERIFY - Show all functions
-- ============================================

SELECT 
  routine_name,
  STRING_AGG(
    parameter_name || ' ' || data_type, 
    ', ' 
    ORDER BY ordinal_position
  ) as parameters
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name IN ('activate_subscription', 'record_payment')
GROUP BY routine_name, specific_name
ORDER BY routine_name;

