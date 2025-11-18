-- Complete Payment Tracking System
-- Run this in Supabase SQL Editor

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT DEFAULT 'monthly', -- 'monthly', 'session', 'package', 'adjustment', 'other'
  payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'other'
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy: coaches can only access their own payments
CREATE POLICY payments_coach_access ON payments
  FOR ALL 
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Grant permissions
GRANT ALL ON payments TO authenticated;

-- Create view for client payment statistics
CREATE OR REPLACE VIEW client_payment_stats AS
SELECT 
  c.id as client_id,
  c.coach_id,
  c.name as client_name,
  c.monthly_fee,
  c.balance_owed,
  COALESCE(SUM(p.amount), 0) as total_paid,
  COUNT(p.id) as payment_count,
  MAX(p.payment_date) as last_payment_date,
  DATE_PART('day', CURRENT_DATE - MAX(p.payment_date)) as days_since_last_payment
FROM clients c
LEFT JOIN payments p ON c.id = p.client_id
WHERE c.active = true
GROUP BY c.id, c.coach_id, c.name, c.monthly_fee, c.balance_owed;

-- Grant access to view
GRANT SELECT ON client_payment_stats TO authenticated;

-- Create function to get client payment summary
CREATE OR REPLACE FUNCTION get_client_payment_summary(p_client_id UUID)
RETURNS TABLE (
  total_paid NUMERIC,
  payment_count BIGINT,
  last_payment_date DATE,
  last_payment_amount NUMERIC,
  avg_payment_amount NUMERIC,
  months_active INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_paid,
    COUNT(*) as payment_count,
    MAX(payment_date) as last_payment_date,
    (SELECT amount FROM payments WHERE client_id = p_client_id ORDER BY payment_date DESC LIMIT 1) as last_payment_amount,
    COALESCE(AVG(amount), 0) as avg_payment_amount,
    CASE 
      WHEN MIN(payment_date) IS NOT NULL 
      THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(payment_date)))::INTEGER + 1
      ELSE 0
    END as months_active
  FROM payments
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_client_payment_summary(UUID) TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Stores all payment records from clients to coaches';
COMMENT ON COLUMN payments.amount IS 'Payment amount (positive for payments received, negative for refunds)';
COMMENT ON COLUMN payments.payment_type IS 'Type: monthly, session, package, adjustment, other';
COMMENT ON COLUMN payments.payment_method IS 'Method: cash, card, transfer, other';
COMMENT ON COLUMN payments.payment_date IS 'Date when payment was received';

