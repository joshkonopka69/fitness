-- Check the actual structure of your coaches table
-- Run this to see what columns you have

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'coaches'
ORDER BY ordinal_position;
