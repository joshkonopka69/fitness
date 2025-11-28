-- =====================================================
-- COMPLETE SUPABASE SETUP FOR FITNESSGURU
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: FIX COACHES TABLE RLS POLICY (Registration Fix)
-- =====================================================

-- Drop any existing INSERT policies
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;
DROP POLICY IF EXISTS "coaches_insert_policy" ON coaches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON coaches;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON coaches;

-- Create the correct INSERT policy for registration
CREATE POLICY "Coaches can insert own profile" 
ON coaches 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Ensure other basic policies exist
DROP POLICY IF EXISTS "Coaches can view own profile" ON coaches;
CREATE POLICY "Coaches can view own profile" 
ON coaches 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON coaches;
CREATE POLICY "Coaches can update own profile" 
ON coaches 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS on coaches table
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: VERIFY COACHES TABLE STRUCTURE
-- =====================================================

-- Check if required columns exist (subscription columns for trial)
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
END $$;

-- =====================================================
-- VERIFICATION - Run this to confirm setup is correct
-- =====================================================

SELECT 'RLS Policies on coaches table:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'coaches';

SELECT 'Coaches table columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'coaches' 
ORDER BY ordinal_position;

SELECT '✅ SETUP COMPLETE! You can now register users.' as status;

