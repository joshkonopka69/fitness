-- Add session_color column to training_sessions table
-- This allows coaches to choose custom colors for their sessions instead of predefined types

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

