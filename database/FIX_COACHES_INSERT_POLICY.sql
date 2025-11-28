-- =====================================================
-- FIX: Coaches INSERT Policy for Registration
-- Run this in Supabase SQL Editor to fix registration
-- =====================================================

-- First, let's check what policies exist on coaches table
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'coaches';

-- Drop the INSERT policy if it exists (to recreate it correctly)
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;
DROP POLICY IF EXISTS "coaches_insert_policy" ON coaches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON coaches;

-- Create the correct INSERT policy
-- This allows any authenticated user to insert a row where the id matches their auth.uid()
CREATE POLICY "Coaches can insert own profile" 
ON coaches 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'coaches';

-- Also ensure RLS is enabled on the coaches table
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: For registration to work, we also need to allow the trigger function 
-- to insert. Let's check if there's a trigger that creates the coach profile.

-- If using service role for inserts via trigger, we need this:
CREATE POLICY "Service role can insert coaches" 
ON coaches 
FOR INSERT 
TO service_role
WITH CHECK (true);

SELECT 'SUCCESS: Policies have been applied!' as status;

