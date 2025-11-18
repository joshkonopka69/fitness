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

