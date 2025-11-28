-- ============================================
-- PHASE 1: CORE SCHEMA `& BASE TABLES
-- Generated 2025-11-26 11:00:59
-- ============================================

-- [START FILE: database_schema_complete.sql]

-- ============================================
-- TrainTrack - Complete Database Schema
-- ============================================
-- This schema includes all tables, views, and functions
-- needed for the complete attendance tracking app
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Coaches table (users who manage clients)
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gym_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table (gym members)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  membership_type TEXT DEFAULT 'Basic' CHECK (membership_type IN ('Basic', 'Standard', 'Premium', 'Personal Training')),
  monthly_fee INTEGER DEFAULT 200,
  membership_due_date DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  session_type TEXT DEFAULT 'general' CHECK (session_type IN ('strength', 'cardio', 'hiit', 'yoga', 'pilates', 'crossfit', 'personal', 'general')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  present BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, client_id)
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date ON training_sessions(coach_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_client ON attendance(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_client ON payment_history(client_id);

-- ============================================
-- 3. VIEWS
-- ============================================

-- View for overdue payments
CREATE OR REPLACE VIEW overdue_payments AS
SELECT 
  c.id,
  c.coach_id,
  c.name,
  c.phone,
  c.membership_due_date,
  c.monthly_fee,
  CURRENT_DATE - c.membership_due_date as days_overdue
FROM clients c
WHERE c.active = true 
  AND c.membership_due_date < CURRENT_DATE
ORDER BY days_overdue DESC;

-- View for client attendance rates
CREATE OR REPLACE VIEW client_attendance_rates AS
SELECT 
  c.id as client_id,
  c.coach_id,
  c.name,
  COUNT(a.id) as total_sessions_attended,
  COUNT(a.id) FILTER (WHERE a.present = true) as sessions_present,
  CASE 
    WHEN COUNT(a.id) > 0 THEN 
      ROUND((COUNT(a.id) FILTER (WHERE a.present = true)::NUMERIC / COUNT(a.id)::NUMERIC) * 100, 0)
    ELSE 0 
  END as attendance_rate
FROM clients c
LEFT JOIN attendance a ON a.client_id = c.id
WHERE c.active = true
GROUP BY c.id, c.coach_id, c.name;

-- View for coach statistics
CREATE OR REPLACE VIEW coach_statistics AS
SELECT 
  co.id as coach_id,
  co.name as coach_name,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.membership_due_date >= CURRENT_DATE) as active_clients,
  COUNT(DISTINCT ts.id) as total_sessions,
  SUM(c.monthly_fee) FILTER (WHERE c.membership_due_date >= CURRENT_DATE) as monthly_revenue,
  ROUND(AVG(car.attendance_rate), 0) as avg_attendance_rate
FROM coaches co
LEFT JOIN clients c ON c.coach_id = co.id AND c.active = true
LEFT JOIN training_sessions ts ON ts.coach_id = co.id
LEFT JOIN client_attendance_rates car ON car.coach_id = co.id
GROUP BY co.id, co.name;

-- View for session attendance summary
CREATE OR REPLACE VIEW session_attendance_summary AS
SELECT 
  ts.id as session_id,
  ts.coach_id,
  ts.title,
  ts.session_date,
  ts.start_time,
  ts.session_type,
  COUNT(a.id) as total_attendees,
  COUNT(a.id) FILTER (WHERE a.present = true) as present_count,
  COUNT(a.id) FILTER (WHERE a.present = false) as absent_count
FROM training_sessions ts
LEFT JOIN attendance a ON a.session_id = ts.id
GROUP BY ts.id, ts.coach_id, ts.title, ts.session_date, ts.start_time, ts.session_type;

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next payment due date
CREATE OR REPLACE FUNCTION calculate_next_due_date(current_due_date DATE)
RETURNS DATE AS $$
BEGIN
  IF current_due_date IS NULL THEN
    RETURN CURRENT_DATE + INTERVAL '30 days';
  ELSE
    RETURN current_due_date + INTERVAL '30 days';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger for coaches updated_at
DROP TRIGGER IF EXISTS update_coaches_updated_at ON coaches;
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for clients updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for training_sessions updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON training_sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Coaches policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own profile" ON coaches;
DROP POLICY IF EXISTS "Coaches can update own profile" ON coaches;
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coaches;

CREATE POLICY "Coaches can view own profile" ON coaches
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Coaches can update own profile" ON coaches
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Coaches can insert own profile" ON coaches
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own clients" ON clients;
DROP POLICY IF EXISTS "Coaches can insert own clients" ON clients;
DROP POLICY IF EXISTS "Coaches can update own clients" ON clients;
DROP POLICY IF EXISTS "Coaches can delete own clients" ON clients;

CREATE POLICY "Coaches can view own clients" ON clients
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = coach_id);

-- Training sessions policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Coaches can insert own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Coaches can update own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Coaches can delete own sessions" ON training_sessions;

CREATE POLICY "Coaches can view own sessions" ON training_sessions
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own sessions" ON training_sessions
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own sessions" ON training_sessions
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own sessions" ON training_sessions
  FOR DELETE USING (auth.uid() = coach_id);

-- Attendance policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view attendance for own sessions" ON attendance;
DROP POLICY IF EXISTS "Coaches can insert attendance for own sessions" ON attendance;
DROP POLICY IF EXISTS "Coaches can update attendance for own sessions" ON attendance;

CREATE POLICY "Coaches can view attendance for own sessions" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id = attendance.session_id 
      AND training_sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert attendance for own sessions" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id = attendance.session_id 
      AND training_sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update attendance for own sessions" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id = attendance.session_id 
      AND training_sessions.coach_id = auth.uid()
    )
  );

-- Payment history policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view payment history for own clients" ON payment_history;
DROP POLICY IF EXISTS "Coaches can insert payment history for own clients" ON payment_history;

CREATE POLICY "Coaches can view payment history for own clients" ON payment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = payment_history.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert payment history for own clients" ON payment_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = payment_history.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- ============================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Note: This section is commented out. 
-- Uncomment to insert sample data for testing
/*
-- Insert sample coach (requires existing auth user)
INSERT INTO coaches (id, email, name, gym_name) VALUES
  ('your-auth-user-id-here', 'coach@example.com', 'Mike Thompson', 'Elite Fitness Studio');

-- Insert sample clients
INSERT INTO clients (coach_id, name, email, phone, membership_type, monthly_fee, membership_due_date) VALUES
  ('your-auth-user-id-here', 'John Doe', 'john@example.com', '+1234567890', 'Premium', 200, CURRENT_DATE + 30),
  ('your-auth-user-id-here', 'Jane Smith', 'jane@example.com', '+1234567891', 'Standard', 150, CURRENT_DATE + 15);

-- Insert sample session
INSERT INTO training_sessions (coach_id, title, session_date, start_time, session_type) VALUES
  ('your-auth-user-id-here', 'Morning HIIT', CURRENT_DATE, '09:00:00', 'hiit');
*/

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- This schema is now ready for production use
-- ============================================




-- [END FILE: database_schema_complete.sql]


-- [START FILE: database_migration_fixed.sql]

-- ============================================
-- TrainTrack - Database Migration Script (FIXED)
-- ============================================
-- This script safely updates your existing database
-- Fixed to handle existing views properly
-- ============================================

-- ============================================
-- STEP 0: Drop existing views first
-- ============================================
-- This prevents conflicts when altering tables

DROP VIEW IF EXISTS session_attendance_summary CASCADE;
DROP VIEW IF EXISTS coach_statistics CASCADE;
DROP VIEW IF EXISTS client_attendance_rates CASCADE;
DROP VIEW IF EXISTS overdue_payments CASCADE;

-- ============================================
-- STEP 1: Add new columns to existing tables
-- ============================================

-- Add new columns to coaches table
DO $$ 
BEGIN
  -- Add gym_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coaches' AND column_name = 'gym_name'
  ) THEN
    ALTER TABLE coaches ADD COLUMN gym_name TEXT;
  END IF;

  -- Add phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coaches' AND column_name = 'phone'
  ) THEN
    ALTER TABLE coaches ADD COLUMN phone TEXT;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coaches' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE coaches ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add new columns to clients table
DO $$ 
BEGIN
  -- Add membership_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'membership_type'
  ) THEN
    ALTER TABLE clients ADD COLUMN membership_type TEXT DEFAULT 'Basic';
    -- Only add constraint if column was just created
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'clients_membership_type_check'
    ) THEN
      ALTER TABLE clients ADD CONSTRAINT clients_membership_type_check 
        CHECK (membership_type IN ('Basic', 'Standard', 'Premium', 'Personal Training'));
    END IF;
  END IF;

  -- Add email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'email'
  ) THEN
    ALTER TABLE clients ADD COLUMN email TEXT;
  END IF;

  -- Add join_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN join_date DATE DEFAULT CURRENT_DATE;
  END IF;
  
  -- Set join_date to created_at for existing records that don't have it
  UPDATE clients SET join_date = created_at::DATE WHERE join_date IS NULL;

  -- Add notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN notes TEXT;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add new columns to training_sessions table
DO $$ 
BEGIN
  -- Add end_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN end_time TIME;
  END IF;

  -- Add session_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN session_type TEXT DEFAULT 'general';
    -- Only add constraint if column was just created
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'sessions_type_check'
    ) THEN
      ALTER TABLE training_sessions ADD CONSTRAINT sessions_type_check 
        CHECK (session_type IN ('strength', 'cardio', 'hiit', 'yoga', 'pilates', 'crossfit', 'personal', 'general'));
    END IF;
  END IF;

  -- Add notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN notes TEXT;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add notes column to attendance table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'notes'
  ) THEN
    ALTER TABLE attendance ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ============================================
-- STEP 2: Create payment_history table if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date ON training_sessions(coach_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_client ON attendance(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_client ON payment_history(client_id);

-- ============================================
-- STEP 4: Create or replace views (NOW SAFE)
-- ============================================

-- View for overdue payments
CREATE OR REPLACE VIEW overdue_payments AS
SELECT 
  c.id,
  c.coach_id,
  c.name,
  c.phone,
  c.membership_due_date,
  c.monthly_fee,
  CURRENT_DATE - c.membership_due_date as days_overdue
FROM clients c
WHERE c.active = true 
  AND c.membership_due_date < CURRENT_DATE
ORDER BY days_overdue DESC;

-- View for client attendance rates
CREATE OR REPLACE VIEW client_attendance_rates AS
SELECT 
  c.id as client_id,
  c.coach_id,
  c.name,
  COUNT(a.id) as total_sessions_attended,
  COUNT(a.id) FILTER (WHERE a.present = true) as sessions_present,
  CASE 
    WHEN COUNT(a.id) > 0 THEN 
      ROUND((COUNT(a.id) FILTER (WHERE a.present = true)::NUMERIC / COUNT(a.id)::NUMERIC) * 100, 0)
    ELSE 0 
  END as attendance_rate
FROM clients c
LEFT JOIN attendance a ON a.client_id = c.id
WHERE c.active = true
GROUP BY c.id, c.coach_id, c.name;

-- View for coach statistics
CREATE OR REPLACE VIEW coach_statistics AS
SELECT 
  co.id as coach_id,
  co.name as coach_name,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.membership_due_date >= CURRENT_DATE) as active_clients,
  COUNT(DISTINCT ts.id) as total_sessions,
  COALESCE(SUM(c.monthly_fee) FILTER (WHERE c.membership_due_date >= CURRENT_DATE), 0) as monthly_revenue,
  COALESCE(ROUND(AVG(car.attendance_rate), 0), 0) as avg_attendance_rate
FROM coaches co
LEFT JOIN clients c ON c.coach_id = co.id AND c.active = true
LEFT JOIN training_sessions ts ON ts.coach_id = co.id
LEFT JOIN client_attendance_rates car ON car.coach_id = co.id
GROUP BY co.id, co.name;

-- View for session attendance summary
CREATE OR REPLACE VIEW session_attendance_summary AS
SELECT 
  ts.id as session_id,
  ts.coach_id,
  ts.title,
  ts.session_date,
  ts.start_time,
  ts.session_type,
  COUNT(a.id) as total_attendees,
  COUNT(a.id) FILTER (WHERE a.present = true) as present_count,
  COUNT(a.id) FILTER (WHERE a.present = false) as absent_count
FROM training_sessions ts
LEFT JOIN attendance a ON a.session_id = ts.id
GROUP BY ts.id, ts.coach_id, ts.title, ts.session_date, ts.start_time, ts.session_type;

-- ============================================
-- STEP 5: Create functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Create triggers
-- ============================================

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_coaches_updated_at ON coaches;
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON training_sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration
SELECT 'Migration completed successfully! ✅' as status;

-- Show updated table structures
SELECT 
  'Table: ' || table_name as info,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('coaches', 'clients', 'training_sessions', 'attendance', 'payment_history')
GROUP BY table_name
ORDER BY table_name;

-- Show created views
SELECT 
  'View: ' || table_name as info
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('overdue_payments', 'client_attendance_rates', 'coach_statistics', 'session_attendance_summary')
ORDER BY table_name;

-- Show new columns in clients table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('membership_type', 'email', 'join_date', 'notes', 'updated_at')
ORDER BY column_name;

-- Show new columns in training_sessions table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND column_name IN ('session_type', 'end_time', 'notes', 'updated_at')
ORDER BY column_name;


-- [END FILE: database_migration_fixed.sql]


-- [START FILE: database_session_improvements.sql]

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


-- [END FILE: database_session_improvements.sql]


-- [START FILE: database_add_client_fields.sql]

-- Add new fields to clients table for professional client management
-- Run this in Supabase SQL Editor

-- Add email field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add membership_type field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Premium';

-- Add balance_owed field for tracking unpaid sessions
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS balance_owed NUMERIC DEFAULT 0;

-- Add notes field for coach notes about client
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add emergency_contact field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Create index on membership_type for filtering
CREATE INDEX IF NOT EXISTS idx_clients_membership_type ON clients(membership_type);

-- Update existing clients to have default values
UPDATE clients
SET 
  membership_type = COALESCE(membership_type, 'Premium'),
  balance_owed = COALESCE(balance_owed, 0)
WHERE membership_type IS NULL OR balance_owed IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients.email IS 'Client email address for communication';
COMMENT ON COLUMN clients.membership_type IS 'Type of membership (Premium, Standard, Basic, Student, Senior, Corporate)';
COMMENT ON COLUMN clients.balance_owed IS 'Outstanding balance for unpaid sessions';
COMMENT ON COLUMN clients.notes IS 'Coach notes about the client (injuries, preferences, etc.)';
COMMENT ON COLUMN clients.emergency_contact IS 'Emergency contact phone number';


-- [END FILE: database_add_client_fields.sql]


-- [START FILE: database_add_session_notes.sql]

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


-- [END FILE: database_add_session_notes.sql]


-- [START FILE: add_notes_column.sql]

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


-- [END FILE: add_notes_column.sql]


-- [START FILE: add_session_color.sql]

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


-- [END FILE: add_session_color.sql]


-- [START FILE: add_client_categories.sql]

-- ===============================================
-- SYSTEM KATEGORII KLIENTÓW
-- ===============================================
-- Pozwala trenerom kategoryzować klientów według
-- lokalizacji i grup treningowych
-- ===============================================

-- Tabela kategorii klientów (główne i podkategorie)
CREATE TABLE IF NOT EXISTS client_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  parent_category_id UUID REFERENCES client_categories(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT '📍',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela przypisań klientów do kategorii (Many-to-Many)
CREATE TABLE IF NOT EXISTS client_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES client_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, category_id)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_categories_coach ON client_categories(coach_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON client_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_category_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON client_category_assignments(category_id);

-- Row Level Security
ALTER TABLE client_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_category_assignments ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla kategorii (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can insert own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can update own categories" ON client_categories;
DROP POLICY IF EXISTS "Coaches can delete own categories" ON client_categories;

CREATE POLICY "Coaches can view own categories" ON client_categories
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own categories" ON client_categories
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own categories" ON client_categories
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own categories" ON client_categories
  FOR DELETE USING (auth.uid() = coach_id);

-- Polityki RLS dla przypisań (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own assignments" ON client_category_assignments;
DROP POLICY IF EXISTS "Coaches can insert own assignments" ON client_category_assignments;
DROP POLICY IF EXISTS "Coaches can delete own assignments" ON client_category_assignments;

CREATE POLICY "Coaches can view own assignments" ON client_category_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own assignments" ON client_category_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own assignments" ON client_category_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- Trigger dla updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON client_categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON client_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funkcja pomocnicza: pobierz kategorie z liczbą klientów
CREATE OR REPLACE VIEW categories_with_client_count AS
SELECT 
  cc.*,
  COUNT(cca.client_id) as client_count
FROM client_categories cc
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
GROUP BY cc.id;

-- ===============================================
-- PRZYKŁADOWE UŻYCIE
-- ===============================================

-- Stwórz kategorię główną (lokalizacja):
-- INSERT INTO client_categories (coach_id, name, location, icon, color)
-- VALUES ('your-coach-id', 'Gym FitZone', 'ul. Sportowa 15', '🏋️', '#007AFF');

-- Stwórz podkategorię (grupa):
-- INSERT INTO client_categories (coach_id, name, parent_category_id, icon, color)
-- VALUES ('your-coach-id', 'Yoga - poniedziałek 18:00', 'parent-category-id', '🧘', '#34C759');

-- Przypisz klienta do kategorii:
-- INSERT INTO client_category_assignments (client_id, category_id)
-- VALUES ('client-id', 'category-id');

-- Pobierz kategorie z liczbą klientów:
-- SELECT * FROM categories_with_client_count WHERE coach_id = 'your-coach-id';

-- ===============================================
-- GOTOWE! ✅
-- ===============================================








-- [END FILE: add_client_categories.sql]


-- [START FILE: database_optimizations.sql]

-- ============================================
-- DATABASE OPTIMIZATIONS & ENHANCEMENTS
-- ============================================
-- Run this script in your Supabase SQL Editor
-- to add missing features and optimize performance
-- ============================================

-- ============================================
-- 1. ADD MISSING COLUMNS
-- ============================================

-- Clients table enhancements
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_attendance_date DATE;

-- Training sessions enhancements
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS recurring_pattern TEXT CHECK (recurring_pattern IN ('none', 'daily', 'weekly', 'monthly', 'custom'));
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#00FF88';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS description TEXT;

-- Attendance enhancements
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_departure BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_notes TEXT;

-- Payment history enhancements
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed', 'refunded'));
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ============================================
-- 2. CREATE NEW TABLES
-- ============================================

-- Client measurements table
CREATE TABLE IF NOT EXISTS client_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measurement_date DATE DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,2),
  muscle_mass NUMERIC(5,2),
  measurements JSONB, -- Store custom measurements
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session templates table
CREATE TABLE IF NOT EXISTS session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type TEXT DEFAULT 'general',
  description TEXT,
  default_capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email', 'sms', 'push', 'whatsapp')),
  reminder_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client notes table (for detailed notes)
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'medical', 'progress', 'goal', 'incident')),
  note_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE USEFUL VIEWS
-- ============================================

-- Client payment status view
CREATE OR REPLACE VIEW client_payment_status AS
SELECT 
  c.id,
  c.coach_id,
  c.name,
  c.email,
  c.phone,
  c.monthly_fee,
  c.membership_due_date,
  c.membership_type,
  CASE 
    WHEN c.membership_due_date IS NULL THEN 'no_due_date'
    WHEN c.membership_due_date < CURRENT_DATE THEN 'overdue'
    WHEN c.membership_due_date <= CURRENT_DATE + 7 THEN 'due_soon'
    ELSE 'paid'
  END as payment_status,
  CASE 
    WHEN c.membership_due_date < CURRENT_DATE THEN CURRENT_DATE - c.membership_due_date
    ELSE 0
  END as days_overdue,
  COALESCE(ph.last_payment_date, c.join_date) as last_payment_date,
  COALESCE(ph.total_paid, 0) as total_paid,
  COALESCE(ph.payment_count, 0) as payment_count
FROM clients c
LEFT JOIN (
  SELECT 
    client_id,
    MAX(payment_date) as last_payment_date,
    SUM(amount) as total_paid,
    COUNT(*) as payment_count
  FROM payment_history
  WHERE payment_status = 'completed'
  GROUP BY client_id
) ph ON ph.client_id = c.id
WHERE c.active = true;

-- Session capacity view
CREATE OR REPLACE VIEW session_capacity AS
SELECT 
  ts.id as session_id,
  ts.coach_id,
  ts.title,
  ts.session_date,
  ts.start_time,
  ts.end_time,
  ts.session_type,
  ts.max_capacity,
  COUNT(a.id) as registered_count,
  COUNT(a.id) FILTER (WHERE a.present = true) as attended_count,
  COUNT(a.id) FILTER (WHERE a.present = false) as absent_count,
  CASE 
    WHEN ts.max_capacity IS NULL THEN 'unlimited'
    WHEN COUNT(a.id) >= ts.max_capacity THEN 'full'
    WHEN COUNT(a.id) >= ts.max_capacity * 0.8 THEN 'almost_full'
    ELSE 'available'
  END as capacity_status,
  CASE 
    WHEN ts.max_capacity IS NOT NULL THEN 
      ROUND((COUNT(a.id)::NUMERIC / ts.max_capacity::NUMERIC) * 100, 0)
    ELSE 0
  END as capacity_percentage
FROM training_sessions ts
LEFT JOIN attendance a ON a.session_id = ts.id
GROUP BY ts.id, ts.coach_id, ts.title, ts.session_date, ts.start_time, ts.end_time, ts.session_type, ts.max_capacity;

-- Attendance streaks view
CREATE OR REPLACE VIEW attendance_streaks AS
WITH attendance_by_date AS (
  SELECT 
    a.client_id,
    ts.session_date,
    a.present,
    LAG(ts.session_date) OVER (PARTITION BY a.client_id ORDER BY ts.session_date) as prev_date
  FROM attendance a
  JOIN training_sessions ts ON ts.id = a.session_id
  WHERE a.present = true
),
streak_groups AS (
  SELECT 
    client_id,
    session_date,
    SUM(CASE WHEN session_date - prev_date > 7 OR prev_date IS NULL THEN 1 ELSE 0 END) 
      OVER (PARTITION BY client_id ORDER BY session_date) as streak_group
  FROM attendance_by_date
)
SELECT 
  client_id,
  COUNT(*) as current_streak,
  MIN(session_date) as streak_start_date,
  MAX(session_date) as streak_end_date
FROM streak_groups
WHERE streak_group = (SELECT MAX(streak_group) FROM streak_groups sg WHERE sg.client_id = streak_groups.client_id)
GROUP BY client_id;

-- Monthly revenue view
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
  co.id as coach_id,
  co.name as coach_name,
  DATE_TRUNC('month', ph.payment_date) as month,
  COUNT(DISTINCT ph.client_id) as paying_clients,
  SUM(ph.amount) as total_revenue,
  SUM(ph.amount) FILTER (WHERE ph.payment_method = 'cash') as cash_revenue,
  SUM(ph.amount) FILTER (WHERE ph.payment_method = 'card') as card_revenue,
  SUM(ph.amount) FILTER (WHERE ph.payment_method = 'transfer') as transfer_revenue,
  AVG(ph.amount) as avg_payment
FROM coaches co
LEFT JOIN clients c ON c.coach_id = co.id
LEFT JOIN payment_history ph ON ph.client_id = c.id AND ph.payment_status = 'completed'
WHERE ph.payment_date IS NOT NULL
GROUP BY co.id, co.name, DATE_TRUNC('month', ph.payment_date)
ORDER BY month DESC;

-- Client engagement view
CREATE OR REPLACE VIEW client_engagement AS
SELECT 
  c.id as client_id,
  c.coach_id,
  c.name,
  c.join_date,
  CURRENT_DATE - c.join_date as days_as_member,
  COUNT(a.id) as total_sessions,
  COUNT(a.id) FILTER (WHERE a.present = true) as sessions_attended,
  COUNT(a.id) FILTER (WHERE a.present = false) as sessions_missed,
  CASE 
    WHEN COUNT(a.id) > 0 THEN 
      ROUND((COUNT(a.id) FILTER (WHERE a.present = true)::NUMERIC / COUNT(a.id)::NUMERIC) * 100, 0)
    ELSE 0 
  END as attendance_rate,
  MAX(ts.session_date) FILTER (WHERE a.present = true) as last_attendance_date,
  CURRENT_DATE - MAX(ts.session_date) FILTER (WHERE a.present = true) as days_since_last_attendance,
  CASE 
    WHEN MAX(ts.session_date) FILTER (WHERE a.present = true) IS NULL THEN 'never_attended'
    WHEN CURRENT_DATE - MAX(ts.session_date) FILTER (WHERE a.present = true) > 30 THEN 'inactive'
    WHEN CURRENT_DATE - MAX(ts.session_date) FILTER (WHERE a.present = true) > 14 THEN 'at_risk'
    ELSE 'active'
  END as engagement_status
FROM clients c
LEFT JOIN attendance a ON a.client_id = c.id
LEFT JOIN training_sessions ts ON ts.id = a.session_id
WHERE c.active = true
GROUP BY c.id, c.coach_id, c.name, c.join_date;

-- ============================================
-- 4. ADD PERFORMANCE INDEXES
-- ============================================

-- Existing indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date ON training_sessions(coach_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_client ON attendance(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_client ON payment_history(client_id);

-- New performance indexes
CREATE INDEX IF NOT EXISTS idx_clients_payment_status 
  ON clients(coach_id, membership_due_date) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_clients_tags 
  ON clients USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_sessions_date_range 
  ON training_sessions(coach_id, session_date, start_time);

CREATE INDEX IF NOT EXISTS idx_sessions_recurring 
  ON training_sessions(coach_id, recurring_pattern) 
  WHERE recurring_pattern != 'none';

CREATE INDEX IF NOT EXISTS idx_attendance_present 
  ON attendance(session_id, present);

CREATE INDEX IF NOT EXISTS idx_payment_history_date 
  ON payment_history(client_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_history_status 
  ON payment_history(payment_status, payment_date);

CREATE INDEX IF NOT EXISTS idx_client_measurements_date 
  ON client_measurements(client_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_client_notes_type 
  ON client_notes(client_id, note_type, created_at DESC);

-- ============================================
-- 5. ADD ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE client_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- Client measurements policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own client measurements" ON client_measurements;
DROP POLICY IF EXISTS "Coaches can insert own client measurements" ON client_measurements;

CREATE POLICY "Coaches can view own client measurements" ON client_measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_measurements.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own client measurements" ON client_measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_measurements.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- Session templates policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own templates" ON session_templates;
DROP POLICY IF EXISTS "Coaches can insert own templates" ON session_templates;
DROP POLICY IF EXISTS "Coaches can update own templates" ON session_templates;
DROP POLICY IF EXISTS "Coaches can delete own templates" ON session_templates;

CREATE POLICY "Coaches can view own templates" ON session_templates
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own templates" ON session_templates
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own templates" ON session_templates
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own templates" ON session_templates
  FOR DELETE USING (auth.uid() = coach_id);

-- Payment reminders policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view reminders for own clients" ON payment_reminders;
DROP POLICY IF EXISTS "Coaches can insert reminders for own clients" ON payment_reminders;

CREATE POLICY "Coaches can view reminders for own clients" ON payment_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = payment_reminders.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert reminders for own clients" ON payment_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = payment_reminders.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- Client notes policies (drop existing first)
DROP POLICY IF EXISTS "Coaches can view own client notes" ON client_notes;
DROP POLICY IF EXISTS "Coaches can insert own client notes" ON client_notes;
DROP POLICY IF EXISTS "Coaches can update own client notes" ON client_notes;
DROP POLICY IF EXISTS "Coaches can delete own client notes" ON client_notes;

CREATE POLICY "Coaches can view own client notes" ON client_notes
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own client notes" ON client_notes
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own client notes" ON client_notes
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own client notes" ON client_notes
  FOR DELETE USING (auth.uid() = coach_id);

-- ============================================
-- 6. ADD USEFUL FUNCTIONS
-- ============================================

-- Function to get client's next payment due date
CREATE OR REPLACE FUNCTION get_next_payment_due_date(p_client_id UUID)
RETURNS DATE AS $$
DECLARE
  v_current_due_date DATE;
  v_next_due_date DATE;
BEGIN
  SELECT membership_due_date INTO v_current_due_date
  FROM clients
  WHERE id = p_client_id;

  IF v_current_due_date IS NULL THEN
    v_next_due_date := CURRENT_DATE + INTERVAL '30 days';
  ELSIF v_current_due_date < CURRENT_DATE THEN
    -- If overdue, set to current date + 30 days
    v_next_due_date := CURRENT_DATE + INTERVAL '30 days';
  ELSE
    -- If not overdue, add 30 days to current due date
    v_next_due_date := v_current_due_date + INTERVAL '30 days';
  END IF;

  RETURN v_next_due_date;
END;
$$ LANGUAGE plpgsql;

-- Function to mark payment as received
CREATE OR REPLACE FUNCTION mark_payment_received(
  p_client_id UUID,
  p_amount INTEGER,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_due_date DATE;
BEGIN
  -- Calculate next due date
  v_next_due_date := get_next_payment_due_date(p_client_id);

  -- Insert payment record
  INSERT INTO payment_history (client_id, amount, payment_method, notes, payment_status)
  VALUES (p_client_id, p_amount, p_payment_method, p_notes, 'completed');

  -- Update client's due date
  UPDATE clients
  SET membership_due_date = v_next_due_date,
      updated_at = NOW()
  WHERE id = p_client_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get coach dashboard stats
CREATE OR REPLACE FUNCTION get_coach_dashboard_stats(p_coach_id UUID)
RETURNS TABLE (
  total_clients INTEGER,
  active_clients INTEGER,
  overdue_clients INTEGER,
  total_sessions_this_month INTEGER,
  total_revenue_this_month INTEGER,
  avg_attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::INTEGER as total_clients,
    COUNT(DISTINCT c.id) FILTER (WHERE c.membership_due_date >= CURRENT_DATE)::INTEGER as active_clients,
    COUNT(DISTINCT c.id) FILTER (WHERE c.membership_due_date < CURRENT_DATE)::INTEGER as overdue_clients,
    COUNT(DISTINCT ts.id)::INTEGER as total_sessions_this_month,
    COALESCE(SUM(ph.amount), 0)::INTEGER as total_revenue_this_month,
    COALESCE(AVG(
      CASE 
        WHEN COUNT(a.id) OVER (PARTITION BY c.id) > 0 THEN
          (COUNT(a.id) FILTER (WHERE a.present = true) OVER (PARTITION BY c.id)::NUMERIC / 
           COUNT(a.id) OVER (PARTITION BY c.id)::NUMERIC) * 100
        ELSE 0
      END
    ), 0)::NUMERIC as avg_attendance_rate
  FROM coaches co
  LEFT JOIN clients c ON c.coach_id = co.id AND c.active = true
  LEFT JOIN training_sessions ts ON ts.coach_id = co.id 
    AND DATE_TRUNC('month', ts.session_date) = DATE_TRUNC('month', CURRENT_DATE)
  LEFT JOIN attendance a ON a.client_id = c.id
  LEFT JOIN payment_history ph ON ph.client_id = c.id 
    AND DATE_TRUNC('month', ph.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    AND ph.payment_status = 'completed'
  WHERE co.id = p_coach_id
  GROUP BY co.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ADD TRIGGERS
-- ============================================

-- Trigger to update client's last_attendance_date
CREATE OR REPLACE FUNCTION update_client_last_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.present = true THEN
    UPDATE clients
    SET last_attendance_date = (
      SELECT session_date 
      FROM training_sessions 
      WHERE id = NEW.session_id
    )
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_last_attendance ON attendance;
CREATE TRIGGER trigger_update_client_last_attendance
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_client_last_attendance();

-- Trigger for client_notes updated_at
DROP TRIGGER IF EXISTS update_client_notes_updated_at ON client_notes;
CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON client_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
-- Your database is now optimized with:
-- ✅ Enhanced columns
-- ✅ New tables for advanced features
-- ✅ Useful views for analytics
-- ✅ Performance indexes
-- ✅ Row Level Security
-- ✅ Helpful functions
-- ✅ Automated triggers
-- ============================================


-- [END FILE: database_optimizations.sql]

