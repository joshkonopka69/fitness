-- =====================================================
-- FITNESSGURU - FINAL DATABASE FIX
-- Run this in Supabase SQL Editor
-- This fixes ALL known issues
-- =====================================================

-- =====================================================
-- 1. DROP ALL DEPENDENT VIEWS FIRST
-- =====================================================
DROP VIEW IF EXISTS session_capacity CASCADE;
DROP VIEW IF EXISTS session_attendance_summary CASCADE;
DROP VIEW IF EXISTS session_stats_by_type CASCADE;
DROP VIEW IF EXISTS session_details CASCADE;
DROP VIEW IF EXISTS coach_sessions CASCADE;
DROP VIEW IF EXISTS upcoming_sessions CASCADE;
DROP VIEW IF EXISTS session_stats CASCADE;
DROP VIEW IF EXISTS daily_sessions CASCADE;
DROP VIEW IF EXISTS training_session_view CASCADE;
DROP VIEW IF EXISTS coach_dashboard CASCADE;
DROP VIEW IF EXISTS active_subscriptions CASCADE;
DROP VIEW IF EXISTS revenue_analytics CASCADE;
DROP VIEW IF EXISTS client_attendance_rates CASCADE;

-- =====================================================
-- 2. FIX TRAINING_SESSIONS - Remove session_type constraint
-- =====================================================
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_session_type_check;
ALTER TABLE training_sessions ALTER COLUMN session_type TYPE TEXT;

-- =====================================================
-- 3. FIX PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'payment_date') THEN
        ALTER TABLE payments ADD COLUMN payment_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'client_id') THEN
        ALTER TABLE payments ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'amount') THEN
        ALTER TABLE payments ADD COLUMN amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'payment_type') THEN
        ALTER TABLE payments ADD COLUMN payment_type VARCHAR(50) DEFAULT 'cash';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
        ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'status') THEN
        ALTER TABLE payments ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'notes') THEN
        ALTER TABLE payments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =====================================================
-- 4. FIX CLIENTS TABLE
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'balance_owed') THEN
        ALTER TABLE clients ADD COLUMN balance_owed DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- 5. FIX COACHES TABLE - Subscription columns
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'subscription_status') THEN
        ALTER TABLE coaches ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE coaches ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'subscription_ends_at') THEN
        ALTER TABLE coaches ADD COLUMN subscription_ends_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coaches' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE coaches ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- Update existing coaches to have trial status
UPDATE coaches SET subscription_status = 'trial', trial_ends_at = NOW() + INTERVAL '14 days'
WHERE subscription_status IS NULL;

-- =====================================================
-- 6. ENABLE RLS AND CREATE POLICIES
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Coaches policies
DROP POLICY IF EXISTS "Coaches can view own profile" ON coaches;
CREATE POLICY "Coaches can view own profile" ON coaches
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;
CREATE POLICY "Coaches can insert own profile" ON coaches
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON coaches;
CREATE POLICY "Coaches can update own profile" ON coaches
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Payments policies
DROP POLICY IF EXISTS "Coaches can view own payments" ON payments;
CREATE POLICY "Coaches can view own payments" ON payments
    FOR SELECT TO authenticated USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can insert own payments" ON payments;
CREATE POLICY "Coaches can insert own payments" ON payments
    FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can update own payments" ON payments;
CREATE POLICY "Coaches can update own payments" ON payments
    FOR UPDATE TO authenticated USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can delete own payments" ON payments;
CREATE POLICY "Coaches can delete own payments" ON payments
    FOR DELETE TO authenticated USING (coach_id = auth.uid());

-- =====================================================
-- 7. CREATE AUTO-COACH TRIGGER FOR REGISTRATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.coaches (id, email, name, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Coach'),
    'trial',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Could not create coach profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 8. CREATE SUBSCRIPTION STATUS FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS get_subscription_status(UUID);
CREATE OR REPLACE FUNCTION get_subscription_status(p_coach_id UUID)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object(
        'status', COALESCE(subscription_status, 'trial'),
        'is_active', CASE 
            WHEN subscription_status = 'active' THEN true 
            WHEN trial_ends_at > NOW() THEN true 
            ELSE false 
        END,
        'days_left', GREATEST(0, EXTRACT(DAY FROM COALESCE(subscription_ends_at, trial_ends_at, NOW() + INTERVAL '14 days') - NOW())::INTEGER),
        'trial_ends_at', trial_ends_at,
        'subscription_ends_at', subscription_ends_at
    ) INTO result 
    FROM coaches 
    WHERE id = p_coach_id;
    
    IF result IS NULL THEN
        result := '{"status":"trial","is_active":true,"days_left":14}'::JSON;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RECREATE NECESSARY VIEWS (Skip if attendance table structure is different)
-- =====================================================
-- Note: The view creation is commented out because the attendance table 
-- structure may vary. Uncomment and adjust if needed.

-- CREATE OR REPLACE VIEW session_attendance_summary AS
-- SELECT 
--     ts.id,
--     ts.coach_id,
--     ts.title,
--     ts.session_date,
--     ts.start_time,
--     ts.session_type::TEXT as session_type,
--     COUNT(a.id) as total_attendees
-- FROM training_sessions ts
-- LEFT JOIN attendance a ON ts.id = a.session_id
-- GROUP BY ts.id;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT '✅ SETUP COMPLETE!' as status;
SELECT 'Payments table columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments';
SELECT 'Coaches table columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coaches' 
AND column_name IN ('subscription_status', 'trial_ends_at', 'subscription_ends_at');

