-- Fix session creation error
-- Remove the old session_type check constraint since we now use session_color

-- Drop the old constraint
ALTER TABLE training_sessions 
DROP CONSTRAINT IF EXISTS sessions_type_check;

-- Make session_type nullable and set default
ALTER TABLE training_sessions 
ALTER COLUMN session_type DROP NOT NULL;

ALTER TABLE training_sessions 
ALTER COLUMN session_type SET DEFAULT 'training';

-- Update any NULL session_types to 'training'
UPDATE training_sessions 
SET session_type = 'training' 
WHERE session_type IS NULL;

-- Verify the changes
SELECT 'Constraint removed successfully!' as status;

-- Show current structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'training_sessions' 
  AND column_name IN ('session_type', 'session_color')
ORDER BY ordinal_position;

