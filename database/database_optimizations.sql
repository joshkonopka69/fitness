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

-- Client measurements policies
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

-- Session templates policies
CREATE POLICY "Coaches can view own templates" ON session_templates
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own templates" ON session_templates
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own templates" ON session_templates
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own templates" ON session_templates
  FOR DELETE USING (auth.uid() = coach_id);

-- Payment reminders policies
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

-- Client notes policies
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

