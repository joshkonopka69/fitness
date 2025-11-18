-- ===============================================
-- FitnessGuru - Fixed Supabase Migration
-- First run check_tables.sql to see your table names
-- ===============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. CHECK WHAT TABLES EXIST FIRST
-- ===============================================

-- Run this query first to see your actual table names:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- ===============================================
-- 2. ADD SESSION COLOR SUPPORT
-- ===============================================

-- Add session_color column to training_sessions table (adjust table name if different)
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS session_color VARCHAR(7) DEFAULT '#00FF88';

-- Update existing sessions to have colors based on their session_type
UPDATE training_sessions
SET session_color = CASE
    WHEN LOWER(session_type) LIKE '%personal%' THEN '#00FF88'
    WHEN LOWER(session_type) LIKE '%group%' THEN '#0EA5E9'
    WHEN LOWER(session_type) LIKE '%bjj%' THEN '#F59E0B'
    WHEN LOWER(session_type) LIKE '%gym%' THEN '#EF4444'
    WHEN LOWER(session_type) LIKE '%hiit%' THEN '#8B5CF6'
    WHEN LOWER(session_type) LIKE '%yoga%' THEN '#EC4899'
    WHEN LOWER(session_type) LIKE '%cardio%' THEN '#10B981'
    ELSE '#00FF88'
END
WHERE session_color IS NULL;

-- Add comment
COMMENT ON COLUMN training_sessions.session_color IS 'Hex color code chosen by coach to identify this session visually';

-- ===============================================
-- 3. ADD SUBSCRIPTION SYSTEM TO COACH_PROFILES
-- ===============================================

-- First, let's check if the table exists and what it's called
-- If coach_profiles doesn't exist, it might be called 'profiles' or 'users'

-- Try to add columns to coach_profiles (if it exists)
DO $$
BEGIN
    -- Check if coach_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_profiles') THEN
        -- Add subscription columns to coach_profiles table
        ALTER TABLE coach_profiles
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
        ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update existing users to have trial
        UPDATE coach_profiles
        SET 
          trial_ends_at = NOW() + INTERVAL '30 days',
          subscription_status = 'trial',
          premium_started_at = NOW()
        WHERE trial_ends_at IS NULL;
        
        RAISE NOTICE 'Added subscription columns to coach_profiles table';
    ELSE
        RAISE NOTICE 'coach_profiles table does not exist. Please check your table names first.';
    END IF;
END $$;

-- ===============================================
-- 4. CREATE PAYMENTS TABLE
-- ===============================================

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PLN',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'card', 'google_pay', 'apple_pay'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint only if coach_profiles exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_profiles') THEN
        ALTER TABLE payments ADD CONSTRAINT fk_payments_coach_id 
        FOREIGN KEY (coach_id) REFERENCES coach_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to payments table';
    ELSE
        RAISE NOTICE 'Skipped foreign key constraint - coach_profiles table not found';
    END IF;
END $$;

-- Add indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own payments
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (coach_id = auth.uid());

-- Policy: Only backend can insert payments
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- ===============================================
-- 5. CREATE SUBSCRIPTION FUNCTIONS (SAFE VERSION)
-- ===============================================

-- Function to check subscription status (works with any table name)
CREATE OR REPLACE FUNCTION check_subscription_status(coach_id_param UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  days_left INTEGER,
  status VARCHAR(20)
) AS $$
DECLARE
    table_exists BOOLEAN;
    table_name TEXT;
BEGIN
    -- Check which table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'coach_profiles' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        table_name := 'coach_profiles';
    ELSE
        -- Try other common table names
        SELECT table_name INTO table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('profiles', 'users', 'coaches')
        LIMIT 1;
        
        IF table_name IS NULL THEN
            RAISE EXCEPTION 'No suitable table found. Please check your table names.';
        END IF;
    END IF;
    
    -- Build and execute dynamic query
    RETURN QUERY EXECUTE format('
        SELECT 
            CASE
                WHEN subscription_status = ''trial'' THEN
                    trial_ends_at > NOW()
                WHEN subscription_status = ''active'' THEN
                    subscription_ends_at > NOW()
                ELSE FALSE
            END as is_active,
            CASE
                WHEN subscription_status = ''trial'' THEN
                    EXTRACT(DAY FROM trial_ends_at - NOW())::INTEGER
                WHEN subscription_status = ''active'' THEN
                    EXTRACT(DAY FROM subscription_ends_at - NOW())::INTEGER
                ELSE 0
            END as days_left,
            COALESCE(subscription_status, ''trial'') as status
        FROM %I
        WHERE id = $1', table_name)
    USING coach_id_param;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 6. VERIFICATION QUERIES
-- ===============================================

-- Check what tables exist
SELECT 'Tables in your database:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if session_color was added
SELECT 'Session color column added:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'training_sessions' 
  AND column_name = 'session_color';

-- Check if payments table was created
SELECT 'Payments table created:' as info;
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- ===============================================
-- NEXT STEPS
-- ===============================================

-- 1. Run this migration
-- 2. Check the verification queries above
-- 3. If coach_profiles doesn't exist, tell me what your user table is called
-- 4. I'll create a specific migration for your table structure

SELECT 'Migration completed! Check the results above.' as status;
