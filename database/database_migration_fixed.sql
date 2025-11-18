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

