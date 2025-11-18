-- ===================================================
-- ADD NOTES COLUMN TO TRAINING SESSIONS
-- ===================================================
-- Run this in Supabase SQL Editor
-- Time: 10 seconds
-- ===================================================

-- Add notes column to training_sessions table
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'training_sessions' 
AND column_name = 'notes';

-- Success message
SELECT 'Notes column added successfully! ✅' as status;

