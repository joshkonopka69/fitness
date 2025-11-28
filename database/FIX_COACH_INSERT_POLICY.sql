-- ============================================
-- FIX: Allow users to create their coach profile
-- ============================================
-- This fixes the "new row violates row-level security policy" error
-- Run this in Supabase SQL Editor
-- ============================================

-- Add INSERT policy for coaches table
-- This allows new users to create their own coach profile
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;

CREATE POLICY "Coaches can insert own profile" ON coaches
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- DONE! ✅
-- ============================================
-- Now users can sign up and create their coach profile automatically!
-- ============================================

