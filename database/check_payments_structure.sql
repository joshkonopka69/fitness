-- Check the actual structure of your payments table
-- Run this BEFORE the migration to see what you have

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Also check what data exists
SELECT COUNT(*) as total_payments FROM payments;

-- Sample data (if any)
SELECT * FROM payments LIMIT 3;
