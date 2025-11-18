-- ============================================
-- ADD NOTES COLUMN TO TRAINING_SESSIONS
-- ============================================
-- This script adds the 'notes' column to the existing training_sessions table
-- Safe to run multiple times (checks if column exists first)

-- Add notes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'training_sessions' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE training_sessions 
    ADD COLUMN notes TEXT;
    
    RAISE NOTICE 'Column "notes" added to training_sessions table';
  ELSE
    RAISE NOTICE 'Column "notes" already exists in training_sessions table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'training_sessions'
ORDER BY ordinal_position;

