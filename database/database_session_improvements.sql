-- Add new fields to training_sessions table
-- Run this in Supabase SQL Editor

-- Add end_time field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add session_type field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'personal';

-- Add duration_minutes field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Create index on session_type for filtering
CREATE INDEX IF NOT EXISTS idx_training_sessions_session_type 
ON training_sessions(session_type);

-- Update existing sessions with calculated end_time (add 60 minutes to start_time)
UPDATE training_sessions
SET 
  end_time = (start_time::TIME + INTERVAL '60 minutes')::TIME,
  session_type = COALESCE(session_type, 'personal'),
  duration_minutes = COALESCE(duration_minutes, 60)
WHERE end_time IS NULL OR session_type IS NULL OR duration_minutes IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN training_sessions.end_time IS 'End time of the session';
COMMENT ON COLUMN training_sessions.session_type IS 'Type of session (personal, group, bjj, gym, hiit, yoga, cardio, other)';
COMMENT ON COLUMN training_sessions.duration_minutes IS 'Duration of the session in minutes';

-- Create a view for session statistics by type
CREATE OR REPLACE VIEW session_stats_by_type AS
SELECT 
  coach_id,
  session_type,
  COUNT(*) as total_sessions,
  AVG(duration_minutes) as avg_duration,
  COUNT(DISTINCT session_date) as unique_days
FROM training_sessions
GROUP BY coach_id, session_type;

-- Grant permissions
GRANT SELECT ON session_stats_by_type TO authenticated;

