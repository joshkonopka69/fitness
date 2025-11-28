-- ============================================
-- QUICK FIX: Allow coach signup
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Drop and recreate the INSERT policy for coaches
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;

CREATE POLICY "Coaches can insert own profile" ON coaches
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify it was created
SELECT 'INSERT policy created successfully!' as status;

