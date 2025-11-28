-- ============================================
-- FitnessGuru - Database Setup for NEW Project
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Project: fitness (bhqtxqecpyoscfrneyjf)
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

-- Coaches policies (Drop existing if any)
DROP POLICY IF EXISTS "Coaches can view own profile" ON coaches;
DROP POLICY IF EXISTS "Coaches can update own profile" ON coaches;

CREATE POLICY "Coaches can view own profile" ON coaches
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Coaches can update own profile" ON coaches
  FOR UPDATE USING (auth.uid() = id);

-- Clients policies
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

-- Training sessions policies
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

-- Attendance policies
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

-- Payment history policies
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
-- SETUP COMPLETE! ✅
-- ============================================
-- Your database is now ready to use!
-- Next steps:
-- 1. Test authentication by signing up a user
-- 2. The coach profile will be created automatically
-- 3. Start using your FitnessGuru app!
-- ============================================

