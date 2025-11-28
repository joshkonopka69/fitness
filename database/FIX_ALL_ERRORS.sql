-- =====================================================
-- FIX ALL DATABASE ERRORS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX PAYMENTS TABLE - Add missing columns
-- =====================================================

-- Check if payments table exists, if not create it
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to payments table
DO $$
BEGIN
    -- Add payment_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'payment_date') THEN
        ALTER TABLE payments ADD COLUMN payment_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    -- Add client_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'client_id') THEN
        ALTER TABLE payments ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
    
    -- Add amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'amount') THEN
        ALTER TABLE payments ADD COLUMN amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add payment_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'payment_type') THEN
        ALTER TABLE payments ADD COLUMN payment_type VARCHAR(50) DEFAULT 'cash';
    END IF;
    
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'status') THEN
        ALTER TABLE payments ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;
    
    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'notes') THEN
        ALTER TABLE payments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
DROP POLICY IF EXISTS "Coaches can view own payments" ON payments;
CREATE POLICY "Coaches can view own payments" ON payments
    FOR SELECT TO authenticated
    USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can insert own payments" ON payments;
CREATE POLICY "Coaches can insert own payments" ON payments
    FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can update own payments" ON payments;
CREATE POLICY "Coaches can update own payments" ON payments
    FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can delete own payments" ON payments;
CREATE POLICY "Coaches can delete own payments" ON payments
    FOR DELETE TO authenticated
    USING (coach_id = auth.uid());

-- =====================================================
-- 2. FIX TRAINING_SESSIONS - Fix session_type constraint
-- =====================================================

-- First, drop the existing check constraint
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_session_type_check;

-- Create a more flexible constraint (or no constraint)
-- Allow any session type value
ALTER TABLE training_sessions 
    ALTER COLUMN session_type TYPE TEXT;

-- If you want to keep some validation, use this instead:
-- ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_session_type_check 
--     CHECK (session_type IN ('personal', 'group', 'online', 'assessment', 'consultation', 'other', NULL));

-- =====================================================
-- 3. FIX COACHES TABLE - Ensure subscription columns exist
-- =====================================================

DO $$
BEGIN
    -- Add subscription_status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'subscription_status') THEN
        ALTER TABLE coaches ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
    END IF;
    
    -- Add trial_ends_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE coaches ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
    END IF;
    
    -- Add subscription_ends_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'subscription_ends_at') THEN
        ALTER TABLE coaches ADD COLUMN subscription_ends_at TIMESTAMPTZ;
    END IF;
    
    -- Add stripe_customer_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE coaches ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- Update existing coaches to have trial status if null
UPDATE coaches 
SET subscription_status = 'trial',
    trial_ends_at = NOW() + INTERVAL '14 days'
WHERE subscription_status IS NULL;

-- =====================================================
-- 4. CREATE/FIX get_subscription_status FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS get_subscription_status(UUID);

CREATE OR REPLACE FUNCTION get_subscription_status(p_coach_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'status', COALESCE(subscription_status, 'trial'),
        'is_active', CASE 
            WHEN subscription_status = 'active' THEN true
            WHEN trial_ends_at > NOW() THEN true
            ELSE false
        END,
        'days_left', CASE 
            WHEN subscription_status = 'active' AND subscription_ends_at IS NOT NULL THEN
                GREATEST(0, EXTRACT(DAY FROM subscription_ends_at - NOW())::INTEGER)
            WHEN trial_ends_at IS NOT NULL THEN
                GREATEST(0, EXTRACT(DAY FROM trial_ends_at - NOW())::INTEGER)
            ELSE 0
        END,
        'trial_ends_at', trial_ends_at,
        'subscription_ends_at', subscription_ends_at
    ) INTO result
    FROM coaches
    WHERE id = p_coach_id;
    
    -- Return default if no coach found
    IF result IS NULL THEN
        result := json_build_object(
            'status', 'trial',
            'is_active', true,
            'days_left', 14,
            'trial_ends_at', NOW() + INTERVAL '14 days',
            'subscription_ends_at', NULL
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. VERIFY FIXES
-- =====================================================

SELECT 'Payments table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

SELECT 'Training sessions constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'training_sessions'::regclass;

SELECT 'Coaches subscription columns:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'coaches' 
AND column_name IN ('subscription_status', 'trial_ends_at', 'subscription_ends_at', 'stripe_customer_id');

SELECT '✅ ALL FIXES APPLIED!' as status;

